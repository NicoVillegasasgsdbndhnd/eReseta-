import express from 'express'
import { connect, hash, signers } from '@hyperledger/fabric-gateway'
import * as grpc from '@grpc/grpc-js'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

const app = express()
app.use(express.json())

// Safety net: never let a stray async error kill the gateway process.
process.on('unhandledRejection', (reason) => console.error('unhandledRejection:', reason))
process.on('uncaughtException', (err) => console.error('uncaughtException:', err))

const CHANNEL_NAME = process.env.CHANNEL_NAME ?? 'ereseta-channel'
const CHAINCODE_NAME = process.env.CHAINCODE_NAME ?? 'prescription'
const PEER_ENDPOINT = process.env.PEER_ENDPOINT ?? 'localhost:7051'
const PEER_HOST_ALIAS = process.env.PEER_HOST_ALIAS ?? 'peer0.deamhi.example.com'
const CRYPTO_PATH = process.env.CRYPTO_PATH ?? path.resolve(__dirname, '../../network/crypto-config')
const FABRIC_GATEWAY_TOKEN = process.env.FABRIC_GATEWAY_TOKEN ?? ''

if (FABRIC_GATEWAY_TOKEN) {
  app.use((req, res, next) => {
    if (req.header('x-fabric-gateway-token') !== FABRIC_GATEWAY_TOKEN) {
      res.status(401).json({ error: 'unauthorized' })
      return
    }
    next()
  })
}

async function buildGrpcConnection(): Promise<grpc.Client> {
  const tlsCert = fs.readFileSync(
    path.join(CRYPTO_PATH, 'peerOrganizations/deamhi.example.com/peers/peer0.deamhi.example.com/tls/ca.crt')
  )
  const tlsCredentials = grpc.credentials.createSsl(tlsCert)
  return new grpc.Client(PEER_ENDPOINT, tlsCredentials, {
    'grpc.ssl_target_name_override': PEER_HOST_ALIAS,
  })
}

async function getContract() {
  const client = await buildGrpcConnection()
  const certPath = path.join(
    CRYPTO_PATH,
    'peerOrganizations/deamhi.example.com/users/Admin@deamhi.example.com/msp/signcerts/cert.pem'
  )
  const keyPath = path.join(
    CRYPTO_PATH,
    'peerOrganizations/deamhi.example.com/users/Admin@deamhi.example.com/msp/keystore/priv_sk'
  )

  const credentials = fs.readFileSync(certPath)
  const privateKeyPem = fs.readFileSync(keyPath)
  const privateKey = crypto.createPrivateKey(privateKeyPem)

  const gateway = connect({
    client,
    identity: { mspId: 'DEAMHIMSP', credentials },
    signer: signers.newPrivateKeySigner(privateKey),
    hash: hash.sha256,
  })

  const network = gateway.getNetwork(CHANNEL_NAME)
  return { contract: network.getContract(CHAINCODE_NAME), gateway, client }
}

// Submit a transaction and return the real Fabric transaction ID. The chaincode functions
// return no payload, so we capture the tx id from the proposal (not the result bytes).
async function submitTxn(contract: any, name: string, args: string[]): Promise<string> {
  const proposal = contract.newProposal(name, { arguments: args })
  const transactionId = proposal.getTransactionId()
  const txn = await proposal.endorse()
  const submitted = await txn.submit()
  // Wait for the transaction to be committed to the ledger before returning, so a following
  // transaction (e.g. verify after create) sees the committed world state.
  const status = await submitted.getStatus()
  if (!status.successful) {
    throw new Error(`transaction ${transactionId} failed to commit (status code ${status.code})`)
  }
  return transactionId
}

app.post('/prescription', async (req, res) => {
  const { prescriptionId, patientId, doctorId, issuedAt, drugList } = req.body
  const { contract, gateway, client } = await getContract()
  try {
    const txId = await submitTxn(contract, 'CreatePrescription', [prescriptionId, patientId, doctorId, issuedAt, drugList])
    res.json({ txId })
  } catch (err) {
    console.error(`${req.method} ${req.path} failed:`, err)
    res.status(500).json({ error: String(err) })
  } finally {
    gateway.close(); client.close()
  }
})

app.put('/prescription/:id/verify', async (req, res) => {
  const { pharmacistId, verifiedAt } = req.body
  const { contract, gateway, client } = await getContract()
  try {
    const txId = await submitTxn(contract, 'VerifyPrescription', [req.params.id, pharmacistId, verifiedAt])
    res.json({ txId })
  } catch (err) {
    console.error(`${req.method} ${req.path} failed:`, err)
    res.status(500).json({ error: String(err) })
  } finally {
    gateway.close(); client.close()
  }
})

app.put('/prescription/:id/dispense', async (req, res) => {
  const { pharmacistId, dispensedAt } = req.body
  const { contract, gateway, client } = await getContract()
  try {
    const txId = await submitTxn(contract, 'DispensePrescription', [req.params.id, pharmacistId, dispensedAt])
    res.json({ txId })
  } catch (err) {
    console.error(`${req.method} ${req.path} failed:`, err)
    res.status(500).json({ error: String(err) })
  } finally {
    gateway.close(); client.close()
  }
})

app.get('/prescription/:id', async (req, res) => {
  const { contract, gateway, client } = await getContract()
  try {
    const result = await contract.evaluateTransaction('QueryPrescriptionById', req.params.id)
    res.json(JSON.parse(Buffer.from(result).toString()))
  } catch (err) {
    console.error(`${req.method} ${req.path} failed:`, err)
    res.status(500).json({ error: String(err) })
  } finally {
    gateway.close(); client.close()
  }
})

app.get('/prescription/:id/history', async (req, res) => {
  const { contract, gateway, client } = await getContract()
  try {
    const result = await contract.evaluateTransaction('GetPrescriptionHistory', req.params.id)
    res.json(JSON.parse(Buffer.from(result).toString()))
  } catch (err) {
    console.error(`${req.method} ${req.path} failed:`, err)
    res.status(500).json({ error: String(err) })
  } finally {
    gateway.close(); client.close()
  }
})

const PORT = process.env.PORT ?? 3001
const HOST = process.env.HOST ?? '127.0.0.1'
app.listen(Number(PORT), HOST, () => console.log(`Fabric gateway listening on ${HOST}:${PORT}`))
