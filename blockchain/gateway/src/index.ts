import express from 'express'
import { connect, hash, signers } from '@hyperledger/fabric-gateway'
import * as grpc from '@grpc/grpc-js'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

const app = express()
app.use(express.json())

const CHANNEL_NAME = process.env.CHANNEL_NAME ?? 'ereseta-channel'
const CHAINCODE_NAME = process.env.CHAINCODE_NAME ?? 'prescription'
const PEER_ENDPOINT = process.env.PEER_ENDPOINT ?? 'localhost:7051'
const PEER_HOST_ALIAS = process.env.PEER_HOST_ALIAS ?? 'peer0.deamhi.example.com'
const CRYPTO_PATH = process.env.CRYPTO_PATH ?? path.resolve(__dirname, '../../network/crypto-config')

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

app.post('/prescription', async (req, res) => {
  const { prescriptionId, patientId, doctorId, issuedAt, drugList } = req.body
  const { contract, gateway, client } = await getContract()
  try {
    const result = await contract.submitTransaction(
      'CreatePrescription', prescriptionId, patientId, doctorId, issuedAt, drugList
    )
    res.json({ txId: Buffer.from(result).toString('hex') })
  } finally {
    gateway.close(); client.close()
  }
})

app.put('/prescription/:id/verify', async (req, res) => {
  const { pharmacistId, verifiedAt } = req.body
  const { contract, gateway, client } = await getContract()
  try {
    const result = await contract.submitTransaction('VerifyPrescription', req.params.id, pharmacistId, verifiedAt)
    res.json({ txId: Buffer.from(result).toString('hex') })
  } finally {
    gateway.close(); client.close()
  }
})

app.put('/prescription/:id/dispense', async (req, res) => {
  const { pharmacistId, dispensedAt } = req.body
  const { contract, gateway, client } = await getContract()
  try {
    const result = await contract.submitTransaction('DispensePrescription', req.params.id, pharmacistId, dispensedAt)
    res.json({ txId: Buffer.from(result).toString('hex') })
  } finally {
    gateway.close(); client.close()
  }
})

app.get('/prescription/:id', async (req, res) => {
  const { contract, gateway, client } = await getContract()
  try {
    const result = await contract.evaluateTransaction('QueryPrescriptionById', req.params.id)
    res.json(JSON.parse(Buffer.from(result).toString()))
  } finally {
    gateway.close(); client.close()
  }
})

app.get('/prescription/:id/history', async (req, res) => {
  const { contract, gateway, client } = await getContract()
  try {
    const result = await contract.evaluateTransaction('GetPrescriptionHistory', req.params.id)
    res.json(JSON.parse(Buffer.from(result).toString()))
  } finally {
    gateway.close(); client.close()
  }
})

const PORT = process.env.PORT ?? 3001
app.listen(PORT, () => console.log(`Fabric gateway listening on :${PORT}`))
