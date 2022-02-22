import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * @typedef {object} LogEntry
 * @property {string} id
 * @property {string} title
 * @property {string|object} message
 */

/**
 * @callback LogFn
 * @param {string} title
 * @param {string|object} message
 * @returns {void}
 */

/**
 * @callback ClearLogFn
 * @returns {void}
 */

/**
 * @returns {[LogEntry[], LogFn, ClearLogFn]}
 */
export function useLog() {
  const id = useRef(0);
  const [logEntries, setLogEntries] = useState([]);

  const log = useCallback(
    (title, message = '') => {
      id.current++;
      setLogEntries(prevLogEntries => [{ id: String(id.current), title, message }].concat(prevLogEntries));      
    },
    [setLogEntries]
  );

  const clearLog = useCallback(() => {
    setLogEntries([]);
  }, [setLogEntries]);

  return [logEntries, log, clearLog];
}
