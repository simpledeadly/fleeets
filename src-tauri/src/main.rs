#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{GlobalShortcutManager, Manager, Window};

fn toggle_window(window: &Window) {
    window.emit("toggle-window", ()).unwrap();
}

fn main() {
    tauri::Builder::default()
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
        .invoke_handler(tauri::generate_handler![]) // <-- ПУСТОЙ ОБРАБОТЧИК. НИКАКИХ КОМАНД.
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}