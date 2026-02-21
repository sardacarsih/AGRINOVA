package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"time"
)

const baseURL = "http://localhost:8080/graphql"

func main() {
	// 1. Login as SuperAdmin
	token, err := login("superadmin", "demo123")
	if err != nil {
		fmt.Printf("Login failed: %v\n", err)
		return
	}
	fmt.Printf("Logged in as Mandor. Token: %s...\n", token[:20])

	// 2. Get Block
	blockID, err := getFirstBlock(token)
	if err != nil {
		fmt.Printf("Failed to get block: %v\n", err)
		return
	}
	fmt.Printf("Using Block ID: %s\n", blockID)

	// 3. Get Employee
	employeeID, err := getFirstEmployee(token)
	if err != nil {
		fmt.Printf("Failed to get employee: %v\n", err)
		return
	}
	fmt.Printf("Using Employee: %s\n", employeeID)

	// 4. Create Harvest
	err = createHarvest(token, blockID, employeeID)
	if err != nil {
		fmt.Printf("Failed to create harvest: %v\n", err)
		return
	}
	fmt.Println("Harvest created successfully! Check Asisten mobile app for notification.")
}

func login(username, password string) (string, error) {
	query := `
		mutation Login($identifier: String!, $password: String!) {
			mobileLogin(input: {
				identifier: $identifier
				password: $password
				platform: ANDROID
			}) {
				accessToken
			}
		}
	`
	vars := map[string]interface{}{
		"identifier": username,
		"password":   password,
	}

	resp, err := sendRequest("", query, vars)
	if err != nil {
		return "", err
	}

	var result struct {
		Data struct {
			MobileLogin struct {
				AccessToken string `json:"accessToken"`
			} `json:"mobileLogin"`
		} `json:"data"`
		Errors []interface{} `json:"errors"`
	}

	if err := json.Unmarshal(resp, &result); err != nil {
		return "", err
	}
	if len(result.Errors) > 0 {
		return "", fmt.Errorf("graphql errors: %v", result.Errors)
	}

	return result.Data.MobileLogin.AccessToken, nil
}

func getFirstBlock(token string) (string, error) {
	query := `
        query {
            blocks {
                id
                name
            }
        }
    `
	resp, err := sendRequest(token, query, nil)
	if err != nil {
		return "", err
	}

	var result struct {
		Data struct {
			Blocks []struct {
				ID string `json:"id"`
			} `json:"blocks"`
		} `json:"data"`
		Errors []interface{} `json:"errors"`
	}

	if err := json.Unmarshal(resp, &result); err != nil {
		return "", err
	}
	if len(result.Errors) > 0 {
		return "", fmt.Errorf("graphql errors: %v", result.Errors)
	}
	if len(result.Data.Blocks) == 0 {
		return "", fmt.Errorf("no blocks found for mandor")
	}

	return result.Data.Blocks[0].ID, nil
}

func getFirstEmployee(token string) (string, error) {
	query := `
        query {
            employees {
                id
                name
            }
        }
    `
	resp, err := sendRequest(token, query, nil)
	if err != nil {
		return "", err
	}

	var result struct {
		Data struct {
			Employees []struct {
				ID   string `json:"id"`
				Name string `json:"name"`
			} `json:"employees"`
		} `json:"data"`
		Errors []interface{} `json:"errors"`
	}
	if err := json.Unmarshal(resp, &result); err != nil {
		return "", err
	}
	if len(result.Errors) > 0 {
		return "", fmt.Errorf("graphql errors: %v", result.Errors)
	}
	if len(result.Data.Employees) == 0 {
		return "", fmt.Errorf("no employees found")
	}
	return result.Data.Employees[0].ID + " - " + result.Data.Employees[0].Name, nil
}

func createHarvest(token, blockID, employeeStr string) error {
	query := `
		mutation CreateHarvest($input: CreateMandorHarvestInput!) {
			createMandorHarvest(input: $input) {
				success
				message
			}
		}
	`

	localID := fmt.Sprintf("test-loc-%d", time.Now().Unix())
	now := time.Now().Format(time.RFC3339)

	vars := map[string]interface{}{
		"input": map[string]interface{}{
			"tanggal":         now,
			"blockId":         blockID,
			"karyawan":        employeeStr,
			"jumlahJanjang":   15,
			"beratTbs":        150.5,
			"deviceId":        "test-script-device",
			"clientTimestamp": now,
			"localId":         localID,
		},
	}

	resp, err := sendRequest(token, query, vars)
	if err != nil {
		return err
	}

	var result struct {
		Data struct {
			CreateMandorHarvest struct {
				Success bool   `json:"success"`
				Message string `json:"message"`
			} `json:"createMandorHarvest"`
		} `json:"data"`
		Errors []interface{} `json:"errors"`
	}

	if err := json.Unmarshal(resp, &result); err != nil {
		return err
	}
	if len(result.Errors) > 0 {
		return fmt.Errorf("graphql errors: %v", result.Errors)
	}

	if !result.Data.CreateMandorHarvest.Success {
		return fmt.Errorf("creation failed: %s", result.Data.CreateMandorHarvest.Message)
	}

	return nil
}

func sendRequest(token, query string, vars map[string]interface{}) ([]byte, error) {
	reqBody := map[string]interface{}{
		"query":     query,
		"variables": vars,
	}
	bodyBytes, _ := json.Marshal(reqBody)

	req, err := http.NewRequest("POST", baseURL, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// check status code
	if resp.StatusCode != http.StatusOK {
		body, _ := ioutil.ReadAll(resp.Body)
		return nil, fmt.Errorf("server error %d: %s", resp.StatusCode, string(body))
	}

	var readErr error
	bodyBytes, readErr = ioutil.ReadAll(resp.Body)
	if readErr != nil {
		return nil, readErr
	}
	return bodyBytes, nil
}
