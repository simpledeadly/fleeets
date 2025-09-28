// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// tauri::... - основные модули Tauri
// tauri_plugin_store::... - модули для плагина Store
use tauri::{GlobalShortcutManager, Manager, Window};

// Функция для переключения окна (остается без изменений)
fn toggle_window(window: &Window) {
    window.emit("toggle-window", ()).unwrap();
}

fn main() {
    tauri::Builder::default()
        //
        // --- ВОТ ЕДИНСТВЕННОЕ ИЗМЕНЕНИЕ ---
        // Мы регистрируем плагин Store здесь, чтобы Tauri знал о нем.
        //
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            let window = app.get_window("main").unwrap();
            window.hide()?;

            let mut shortcut_manager = app.global_shortcut_manager();
            let window_clone = window.clone();
            shortcut_manager.register("Alt+Space", move || {
                toggle_window(&window_clone);
            })?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}