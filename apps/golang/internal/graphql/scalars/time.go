package scalars

import (
	"fmt"
	"io"
	"strconv"
	"time"

	"agrinovagraphql/server/pkg/utils"

	"github.com/99designs/gqlgen/graphql"
)

// Time is a custom scalar for handling various time formats
// It extends time.Time with flexible parsing that supports:
// - RFC3339 (2006-01-02T15:04:05Z07:00)
// - ISO8601 without timezone (2006-01-02T15:04:05.000) - common from mobile apps
// - Date only (2006-01-02)
type Time time.Time

// MarshalGQL implements graphql.Marshaler interface
func (t Time) MarshalGQL(w io.Writer) {
	if time.Time(t).IsZero() {
		io.WriteString(w, "null")
		return
	}
	io.WriteString(w, strconv.Quote(time.Time(t).Format(time.RFC3339)))
}

// UnmarshalGQL implements graphql.Unmarshaler interface
func (t *Time) UnmarshalGQL(v interface{}) error {
	switch val := v.(type) {
	case string:
		parsed, err := utils.Time.ParseTimeString(val)
		if err != nil {
			return fmt.Errorf("Time scalar: %w", err)
		}
		*t = Time(parsed)
		return nil
	case int:
		*t = Time(time.Unix(int64(val), 0))
		return nil
	case int64:
		*t = Time(time.Unix(val, 0))
		return nil
	case time.Time:
		*t = Time(val)
		return nil
	default:
		return fmt.Errorf("Time scalar: cannot unmarshal %T into Time", v)
	}
}

// Time returns the underlying time.Time value
func (t Time) Time() time.Time {
	return time.Time(t)
}

// MarshalTime serializes time.Time as RFC3339 string (kept for backwards compatibility)
func MarshalTime(t time.Time) graphql.Marshaler {
	if t.IsZero() {
		return graphql.Null
	}
	return graphql.WriterFunc(func(w io.Writer) {
		io.WriteString(w, strconv.Quote(t.Format(time.RFC3339)))
	})
}

// UnmarshalTime deserializes time from various formats (kept for backwards compatibility)
func UnmarshalTime(v interface{}) (time.Time, error) {
	switch v := v.(type) {
	case string:
		return utils.Time.ParseTimeString(v)
	case int:
		return time.Unix(int64(v), 0), nil
	case int64:
		return time.Unix(v, 0), nil
	case time.Time:
		return v, nil
	default:
		return time.Time{}, fmt.Errorf("cannot unmarshal %T into time.Time", v)
	}
}
