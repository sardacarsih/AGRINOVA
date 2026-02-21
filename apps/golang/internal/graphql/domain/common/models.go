// Package common contains shared GraphQL types used across multiple domains.
package common

import (
	"bytes"
	"fmt"
	"io"
	"strconv"
	"time"
)

// ============================================================================
// SHARED TYPES
// ============================================================================

// PageInfo provides pagination information for list queries.
type PageInfo struct {
	StartCursor     *string `json:"startCursor,omitempty"`
	EndCursor       *string `json:"endCursor,omitempty"`
	HasNextPage     bool    `json:"hasNextPage"`
	HasPreviousPage bool    `json:"hasPreviousPage"`
	CurrentPage     int32   `json:"currentPage"`
	TotalPages      int32   `json:"totalPages"`
}

// Coordinates holds GPS location data.
type Coordinates struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

// PhotoUploadError represents an error during photo upload.
type PhotoUploadError struct {
	PhotoID string  `json:"photoId"`
	Error   string  `json:"error"`
	Code    *string `json:"code,omitempty"`
}

// TrendDataPoint represents a single point in trend data.
type TrendDataPoint struct {
	Date  time.Time `json:"date"`
	Value float64   `json:"value"`
	Label *string   `json:"label,omitempty"`
}

// ============================================================================
// ENUMS
// ============================================================================

// SortDirection represents sort order direction.
type SortDirection string

const (
	SortDirectionAsc  SortDirection = "ASC"
	SortDirectionDesc SortDirection = "DESC"
)

var AllSortDirection = []SortDirection{
	SortDirectionAsc,
	SortDirectionDesc,
}

func (e SortDirection) IsValid() bool {
	switch e {
	case SortDirectionAsc, SortDirectionDesc:
		return true
	}
	return false
}

func (e SortDirection) String() string {
	return string(e)
}

func (e *SortDirection) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}
	*e = SortDirection(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid SortDirection", str)
	}
	return nil
}

func (e SortDirection) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

func (e *SortDirection) UnmarshalJSON(b []byte) error {
	s, err := strconv.Unquote(string(b))
	if err != nil {
		return err
	}
	return e.UnmarshalGQL(s)
}

func (e SortDirection) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	e.MarshalGQL(&buf)
	return buf.Bytes(), nil
}

// SyncStatus represents synchronization status.
type SyncStatus string

const (
	SyncStatusPending  SyncStatus = "PENDING"
	SyncStatusSynced   SyncStatus = "SYNCED"
	SyncStatusFailed   SyncStatus = "FAILED"
	SyncStatusConflict SyncStatus = "CONFLICT"
)

var AllSyncStatus = []SyncStatus{
	SyncStatusPending,
	SyncStatusSynced,
	SyncStatusFailed,
	SyncStatusConflict,
}

func (e SyncStatus) IsValid() bool {
	switch e {
	case SyncStatusPending, SyncStatusSynced, SyncStatusFailed, SyncStatusConflict:
		return true
	}
	return false
}

func (e SyncStatus) String() string {
	return string(e)
}

func (e *SyncStatus) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}
	*e = SyncStatus(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid SyncStatus", str)
	}
	return nil
}

func (e SyncStatus) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

func (e *SyncStatus) UnmarshalJSON(b []byte) error {
	s, err := strconv.Unquote(string(b))
	if err != nil {
		return err
	}
	return e.UnmarshalGQL(s)
}

func (e SyncStatus) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	e.MarshalGQL(&buf)
	return buf.Bytes(), nil
}

// SyncItemStatus represents the outcome of a single sync record push.
type SyncItemStatus string

const (
	SyncItemStatusAccepted SyncItemStatus = "ACCEPTED"
	SyncItemStatusRejected SyncItemStatus = "REJECTED"
)

func (e SyncItemStatus) IsValid() bool {
	switch e {
	case SyncItemStatusAccepted, SyncItemStatusRejected:
		return true
	}
	return false
}

func (e SyncItemStatus) String() string {
	return string(e)
}

func (e *SyncItemStatus) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}
	*e = SyncItemStatus(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid SyncItemStatus", str)
	}
	return nil
}

func (e SyncItemStatus) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

// SyncOperation represents the type of sync operation.
type SyncOperation string

const (
	SyncOperationCreate SyncOperation = "CREATE"
	SyncOperationUpdate SyncOperation = "UPDATE"
	SyncOperationDelete SyncOperation = "DELETE"
)

var AllSyncOperation = []SyncOperation{
	SyncOperationCreate,
	SyncOperationUpdate,
	SyncOperationDelete,
}

func (e SyncOperation) IsValid() bool {
	switch e {
	case SyncOperationCreate, SyncOperationUpdate, SyncOperationDelete:
		return true
	}
	return false
}

func (e SyncOperation) String() string {
	return string(e)
}

func (e *SyncOperation) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}
	*e = SyncOperation(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid SyncOperation", str)
	}
	return nil
}

func (e SyncOperation) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

func (e *SyncOperation) UnmarshalJSON(b []byte) error {
	s, err := strconv.Unquote(string(b))
	if err != nil {
		return err
	}
	return e.UnmarshalGQL(s)
}

func (e SyncOperation) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	e.MarshalGQL(&buf)
	return buf.Bytes(), nil
}

// ConflictResolution represents conflict resolution strategy.
type ConflictResolution string

const (
	ConflictResolutionManual     ConflictResolution = "MANUAL"
	ConflictResolutionLocalWins  ConflictResolution = "LOCAL_WINS"
	ConflictResolutionRemoteWins ConflictResolution = "REMOTE_WINS"
	ConflictResolutionMerge      ConflictResolution = "MERGE"
	ConflictResolutionLatestWins ConflictResolution = "LATEST_WINS"
)

var AllConflictResolution = []ConflictResolution{
	ConflictResolutionManual,
	ConflictResolutionLocalWins,
	ConflictResolutionRemoteWins,
	ConflictResolutionMerge,
	ConflictResolutionLatestWins,
}

func (e ConflictResolution) IsValid() bool {
	switch e {
	case ConflictResolutionManual, ConflictResolutionLocalWins, ConflictResolutionRemoteWins, ConflictResolutionMerge, ConflictResolutionLatestWins:
		return true
	}
	return false
}

func (e ConflictResolution) String() string {
	return string(e)
}

func (e *ConflictResolution) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}
	*e = ConflictResolution(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid ConflictResolution", str)
	}
	return nil
}

func (e ConflictResolution) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

func (e *ConflictResolution) UnmarshalJSON(b []byte) error {
	s, err := strconv.Unquote(string(b))
	if err != nil {
		return err
	}
	return e.UnmarshalGQL(s)
}

func (e ConflictResolution) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	e.MarshalGQL(&buf)
	return buf.Bytes(), nil
}

// MonitorStatus represents the monitoring status.
type MonitorStatus string

const (
	MonitorStatusNormal   MonitorStatus = "NORMAL"
	MonitorStatusWarning  MonitorStatus = "WARNING"
	MonitorStatusCritical MonitorStatus = "CRITICAL"
	MonitorStatusOffline  MonitorStatus = "OFFLINE"
	MonitorStatusAlert    MonitorStatus = "ALERT"
)

var AllMonitorStatus = []MonitorStatus{
	MonitorStatusNormal,
	MonitorStatusWarning,
	MonitorStatusCritical,
	MonitorStatusOffline,
	MonitorStatusAlert,
}

func (e MonitorStatus) IsValid() bool {
	switch e {
	case MonitorStatusNormal, MonitorStatusWarning, MonitorStatusCritical, MonitorStatusOffline, MonitorStatusAlert:
		return true
	}
	return false
}

func (e MonitorStatus) String() string {
	return string(e)
}

func (e *MonitorStatus) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}
	*e = MonitorStatus(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid MonitorStatus", str)
	}
	return nil
}

func (e MonitorStatus) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

func (e *MonitorStatus) UnmarshalJSON(b []byte) error {
	s, err := strconv.Unquote(string(b))
	if err != nil {
		return err
	}
	return e.UnmarshalGQL(s)
}

func (e MonitorStatus) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	e.MarshalGQL(&buf)
	return buf.Bytes(), nil
}

// TrendDirection represents direction of a trend.
type TrendDirection string

const (
	TrendDirectionUp     TrendDirection = "UP"
	TrendDirectionDown   TrendDirection = "DOWN"
	TrendDirectionStable TrendDirection = "STABLE"
)

var AllTrendDirection = []TrendDirection{
	TrendDirectionUp,
	TrendDirectionDown,
	TrendDirectionStable,
}

func (e TrendDirection) IsValid() bool {
	switch e {
	case TrendDirectionUp, TrendDirectionDown, TrendDirectionStable:
		return true
	}
	return false
}

func (e TrendDirection) String() string {
	return string(e)
}

func (e *TrendDirection) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}
	*e = TrendDirection(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid TrendDirection", str)
	}
	return nil
}

func (e TrendDirection) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

func (e *TrendDirection) UnmarshalJSON(b []byte) error {
	s, err := strconv.Unquote(string(b))
	if err != nil {
		return err
	}
	return e.UnmarshalGQL(s)
}

func (e TrendDirection) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	e.MarshalGQL(&buf)
	return buf.Bytes(), nil
}

// ActionPriority represents priority levels for actions.
type ActionPriority string

const (
	ActionPriorityLow      ActionPriority = "LOW"
	ActionPriorityMedium   ActionPriority = "MEDIUM"
	ActionPriorityHigh     ActionPriority = "HIGH"
	ActionPriorityCritical ActionPriority = "CRITICAL"
)

var AllActionPriority = []ActionPriority{
	ActionPriorityLow,
	ActionPriorityMedium,
	ActionPriorityHigh,
	ActionPriorityCritical,
}

func (e ActionPriority) IsValid() bool {
	switch e {
	case ActionPriorityLow, ActionPriorityMedium, ActionPriorityHigh, ActionPriorityCritical:
		return true
	}
	return false
}

func (e ActionPriority) String() string {
	return string(e)
}

func (e *ActionPriority) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}
	*e = ActionPriority(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid ActionPriority", str)
	}
	return nil
}

func (e ActionPriority) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

func (e *ActionPriority) UnmarshalJSON(b []byte) error {
	s, err := strconv.Unquote(string(b))
	if err != nil {
		return err
	}
	return e.UnmarshalGQL(s)
}

func (e ActionPriority) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	e.MarshalGQL(&buf)
	return buf.Bytes(), nil
}

// ActionItemStatus represents status of action items.
type ActionItemStatus string

const (
	ActionItemStatusPending    ActionItemStatus = "PENDING"
	ActionItemStatusInProgress ActionItemStatus = "IN_PROGRESS"
	ActionItemStatusCompleted  ActionItemStatus = "COMPLETED"
	ActionItemStatusCancelled  ActionItemStatus = "CANCELLED"
)

var AllActionItemStatus = []ActionItemStatus{
	ActionItemStatusPending,
	ActionItemStatusInProgress,
	ActionItemStatusCompleted,
	ActionItemStatusCancelled,
}

func (e ActionItemStatus) IsValid() bool {
	switch e {
	case ActionItemStatusPending, ActionItemStatusInProgress, ActionItemStatusCompleted, ActionItemStatusCancelled:
		return true
	}
	return false
}

func (e ActionItemStatus) String() string {
	return string(e)
}

func (e *ActionItemStatus) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}
	*e = ActionItemStatus(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid ActionItemStatus", str)
	}
	return nil
}

func (e ActionItemStatus) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

func (e *ActionItemStatus) UnmarshalJSON(b []byte) error {
	s, err := strconv.Unquote(string(b))
	if err != nil {
		return err
	}
	return e.UnmarshalGQL(s)
}

func (e ActionItemStatus) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	e.MarshalGQL(&buf)
	return buf.Bytes(), nil
}

// EventSeverity represents severity levels for events.
type EventSeverity string

const (
	EventSeverityInfo     EventSeverity = "INFO"
	EventSeverityWarning  EventSeverity = "WARNING"
	EventSeverityError    EventSeverity = "ERROR"
	EventSeverityCritical EventSeverity = "CRITICAL"
)

var AllEventSeverity = []EventSeverity{
	EventSeverityInfo,
	EventSeverityWarning,
	EventSeverityError,
	EventSeverityCritical,
}

func (e EventSeverity) IsValid() bool {
	switch e {
	case EventSeverityInfo, EventSeverityWarning, EventSeverityError, EventSeverityCritical:
		return true
	}
	return false
}

func (e EventSeverity) String() string {
	return string(e)
}

func (e *EventSeverity) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}
	*e = EventSeverity(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid EventSeverity", str)
	}
	return nil
}

func (e EventSeverity) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

func (e *EventSeverity) UnmarshalJSON(b []byte) error {
	s, err := strconv.Unquote(string(b))
	if err != nil {
		return err
	}
	return e.UnmarshalGQL(s)
}

func (e EventSeverity) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	e.MarshalGQL(&buf)
	return buf.Bytes(), nil
}
