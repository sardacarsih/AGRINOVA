//go:build ignore
// +build ignore

package main

import (
	"fmt"
	"log"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type GuestLog struct {
	ID                  string
	VehiclePlate        string
	DriverName          string
	EntryTime           *time.Time
	ExitTime            *time.Time
	LoadType            *string
	CargoVolume         *string
	CargoOwner          *string
	DeliveryOrderNumber *string
	SecondCargo         *string
	GenerationIntent    string
}

func main() {
	dsn := "host=localhost user=agrinova password=itBOSS dbname=agrinova_go port=5432 sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}

	var logs []GuestLog
	if err := db.Table("gate_guest_logs").Where("vehicle_plate = ?", "DE1234DE").Order("created_at DESC").Find(&logs).Error; err != nil {
		log.Fatal(err)
	}

	for _, l := range logs {
		fmt.Printf("ID: %s\n", l.ID)
		fmt.Printf("Plate: %s\n", l.VehiclePlate)
		fmt.Printf("Intent: %s\n", l.GenerationIntent)
		fmt.Printf("EntryTime: %v\n", l.EntryTime)
		fmt.Printf("ExitTime: %v\n", l.ExitTime)
		fmt.Printf("SecondCargo: %v\n", ptrStr(l.SecondCargo))
		fmt.Printf("LoadType: %v\n", ptrStr(l.LoadType))
		fmt.Printf("DO: %v\n", ptrStr(l.DeliveryOrderNumber))
		fmt.Printf("Owner: %v\n", ptrStr(l.CargoOwner))
		fmt.Println("---")
	}
}

func ptrStr(s *string) string {
	if s == nil {
		return "<nil>"
	}
	return *s
}
