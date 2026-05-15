use std::collections::VecDeque;
use std::fs::OpenOptions;
use std::io::Write;
use std::sync::Mutex;
use tauri::State;

const RING_BUFFER_CAPACITY: usize = 500;

pub struct Logger {
    file_path: String,
    buffer: Mutex<VecDeque<String>>,
}

impl Logger {
    pub fn new(file_path: String) -> Self {
        Self {
            file_path,
            buffer: Mutex::new(VecDeque::with_capacity(RING_BUFFER_CAPACITY)),
        }
    }

    pub fn log(&self, level: &str, module: &str, message: &str) {
        let ts = chrono_like_now();
        // JSONL format: one JSON object per line
        let json_line = format!(
            r#"{{"timestamp":"{}","level":"{}","module":"{}","message":"{}"}}"#,
            ts,
            level,
            module,
            message.replace('\\', "\\\\").replace('"', "\\\""),
        );

        // Write to ring buffer
        if let Ok(mut buf) = self.buffer.lock() {
            if buf.len() >= RING_BUFFER_CAPACITY {
                buf.pop_front(); // Evict oldest entry
            }
            buf.push_back(json_line.clone());
            // Flush every 10 lines
            if buf.len() >= 10 {
                self.flush(&mut buf);
            }
        }

        // Also stderr for dev (plain text format)
        eprintln!("[{}] [{}] [{}] {}", ts, level, module, message);
    }

    pub fn flush(&self, buf: &mut VecDeque<String>) {
        if buf.is_empty() {
            return;
        }
        if let Ok(mut file) = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.file_path)
        {
            for line in buf.drain(..) {
                let _ = writeln!(file, "{}", line);
            }
            let _ = file.flush();
        }
    }

    pub fn flush_all(&self) {
        if let Ok(mut buf) = self.buffer.lock() {
            self.flush(&mut buf);
        }
    }
}

fn chrono_like_now() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap();
    let secs = now.as_secs();
    let days = secs / 86400;
    let time_of_day = secs % 86400;
    let h = time_of_day / 3600;
    let m = (time_of_day % 3600) / 60;
    let s = time_of_day % 60;
    format!("{} {:02}:{:02}:{:02}", days, h, m, s)
}

// ==================== Tauri Commands ====================

#[tauri::command]
pub fn log_message(state: State<'_, Logger>, level: String, module: String, message: String) {
    state.log(&level, &module, &message);
    state.flush_all();
}

#[tauri::command]
pub fn read_logs(state: State<'_, Logger>, lines: Option<usize>) -> Result<String, String> {
    state.flush_all();
    let max_lines = lines.unwrap_or(200);
    let content = std::fs::read_to_string(&state.file_path).unwrap_or_default();
    let result: String = content
        .lines()
        .rev()
        .take(max_lines)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect::<Vec<_>>()
        .join("\n");
    Ok(result)
}
