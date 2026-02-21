package logger

import (
	"log"
	"os"
)

type Logger struct {
	*log.Logger
}

func New() *Logger {
	return &Logger{
		Logger: log.New(os.Stdout, "[AGRINOVA] ", log.LstdFlags|log.Lshortfile),
	}
}

func (l *Logger) Info(msg string, args ...interface{}) {
	l.Printf("[INFO] "+msg, args...)
}

func (l *Logger) Error(msg string, args ...interface{}) {
	l.Printf("[ERROR] "+msg, args...)
}

func (l *Logger) Debug(msg string, args ...interface{}) {
	if os.Getenv("GO_ENV") == "development" {
		l.Printf("[DEBUG] "+msg, args...)
	}
}

func (l *Logger) Warn(msg string, data ...interface{}) {
	// Handle both format string args and map data
	if len(data) == 1 {
		if dataMap, ok := data[0].(map[string]interface{}); ok {
			l.Printf("[WARN] "+msg+" %+v", dataMap)
			return
		}
	}
	l.Printf("[WARN] "+msg, data...)
}

func (l *Logger) Fatal(msg string, args ...interface{}) {
	l.Printf("[FATAL] "+msg, args...)
	os.Exit(1)
}

// Global logger instance
var defaultLogger = New()

// Package-level functions for convenience
func Info(msg string, args ...interface{}) {
	defaultLogger.Info(msg, args...)
}

func Error(msg string, args ...interface{}) {
	defaultLogger.Error(msg, args...)
}

func Debug(msg string, args ...interface{}) {
	defaultLogger.Debug(msg, args...)
}

func Warn(msg string, data ...interface{}) {
	defaultLogger.Warn(msg, data...)
}

func Fatal(msg string, args ...interface{}) {
	defaultLogger.Printf("[FATAL] "+msg, args...)
	os.Exit(1)
}
