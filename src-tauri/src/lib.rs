// File: src-tauri/src/lib.rs
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, GlobalShortcutManager, Manager, Runtime};

#[derive(Serialize, Deserialize)]
struct Note {
    content: String,
}

// Используем API v1: path_resolver
fn get_notes_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let path = app
        .path_resolver()
        .app_config_dir()
        .ok_or_else(|| "Не удалось получить папку конфигурации приложения.".to_string())?;

    if !path.exists() {
        fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    }
    Ok(path.join("notes.json"))
}

#[tauri::command]
async fn save_note<R: Runtime>(app: AppHandle<R>, content: String) -> Result<(), String> {
    let note = Note { content };
    let file_path = get_notes_path(&app)?;
    let json_content = serde_json::to_string(&note).map_err(|e| e.to_string())?;
    fs::write(file_path, json_content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn load_note<R: Runtime>(app: AppHandle<R>) -> Result<String, String> {
    let file_path = get_notes_path(&app)?;
    if file_path.exists() {
        let content = fs::read_to_string(file_path).map_err(|e| e.to_string())?;
        let note: Note = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        Ok(note.content)
    } else {
        Ok("".to_string())
    }
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle();
            // Используем API v1: get_window
            let main_window = app.get_window("main").unwrap();
            
            // Используем API v1: global_shortcut_manager
            let mut shortcut_manager = handle.global_shortcut_manager();
            let window_clone = main_window.clone();

            shortcut_manager
                .register("Alt+Space", move || {
                    if window_clone.is_visible().unwrap() && window_clone.is_focused().unwrap() {
                        window_clone.hide().unwrap();
                    } else {
                        window_clone.show().unwrap();
                        window_clone.set_focus().unwrap();
                    }
                })
                .expect("Не удалось зарегистрировать глобальное сочетание клавиш");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![save_note, load_note])
        .run(tauri::generate_context!())
        .expect("Ошибка при запуске приложения Tauri");
}