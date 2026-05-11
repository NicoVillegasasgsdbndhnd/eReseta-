package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type PrescriptionContract struct {
	contractapi.Contract
}

type PrescriptionEvent struct {
	PrescriptionID string `json:"prescriptionId"`
	PatientID      string `json:"patientId"`
	DoctorID       string `json:"doctorId"`
	EventType      string `json:"eventType"` // ISSUED, VERIFIED, DISPENSED
	ActorID        string `json:"actorId"`
	OccurredAt     string `json:"occurredAt"`
	DrugList       string `json:"drugList,omitempty"`
}

func (c *PrescriptionContract) CreatePrescription(ctx contractapi.TransactionContextInterface,
	prescriptionID, patientID, doctorID, issuedAt, drugList string) error {

	existing, err := ctx.GetStub().GetState(prescriptionID)
	if err != nil {
		return err
	}
	if existing != nil {
		return fmt.Errorf("prescription %s already exists", prescriptionID)
	}

	event := PrescriptionEvent{
		PrescriptionID: prescriptionID,
		PatientID:      patientID,
		DoctorID:       doctorID,
		EventType:      "ISSUED",
		ActorID:        doctorID,
		OccurredAt:     issuedAt,
		DrugList:       drugList,
	}

	data, err := json.Marshal(event)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(prescriptionID, data)
}

func (c *PrescriptionContract) VerifyPrescription(ctx contractapi.TransactionContextInterface,
	prescriptionID, pharmacistID, verifiedAt string) error {

	return c.appendEvent(ctx, prescriptionID, "VERIFIED", pharmacistID, verifiedAt)
}

func (c *PrescriptionContract) DispensePrescription(ctx contractapi.TransactionContextInterface,
	prescriptionID, pharmacistID, dispensedAt string) error {

	return c.appendEvent(ctx, prescriptionID, "DISPENSED", pharmacistID, dispensedAt)
}

func (c *PrescriptionContract) GetPrescriptionHistory(ctx contractapi.TransactionContextInterface,
	prescriptionID string) ([]*PrescriptionEvent, error) {

	iter, err := ctx.GetStub().GetHistoryForKey(prescriptionID)
	if err != nil {
		return nil, err
	}
	defer iter.Close()

	var events []*PrescriptionEvent
	for iter.HasNext() {
		result, err := iter.Next()
		if err != nil {
			return nil, err
		}
		var event PrescriptionEvent
		if err := json.Unmarshal(result.Value, &event); err != nil {
			return nil, err
		}
		events = append(events, &event)
	}
	return events, nil
}

func (c *PrescriptionContract) QueryPrescriptionById(ctx contractapi.TransactionContextInterface,
	prescriptionID string) (*PrescriptionEvent, error) {

	data, err := ctx.GetStub().GetState(prescriptionID)
	if err != nil {
		return nil, err
	}
	if data == nil {
		return nil, fmt.Errorf("prescription %s not found", prescriptionID)
	}

	var event PrescriptionEvent
	if err := json.Unmarshal(data, &event); err != nil {
		return nil, err
	}
	return &event, nil
}

func (c *PrescriptionContract) appendEvent(ctx contractapi.TransactionContextInterface,
	prescriptionID, eventType, actorID, occurredAt string) error {

	data, err := ctx.GetStub().GetState(prescriptionID)
	if err != nil {
		return err
	}
	if data == nil {
		return fmt.Errorf("prescription %s not found", prescriptionID)
	}

	event := PrescriptionEvent{
		PrescriptionID: prescriptionID,
		EventType:      eventType,
		ActorID:        actorID,
		OccurredAt:     occurredAt,
	}
	if occurredAt == "" {
		event.OccurredAt = time.Now().UTC().Format(time.RFC3339)
	}

	updated, err := json.Marshal(event)
	if err != nil {
		return err
	}
	return ctx.GetStub().PutState(prescriptionID, updated)
}
