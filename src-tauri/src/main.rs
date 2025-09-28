// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{api::notification::Notification, GlobalShortcutManager, Manager, Window};

// Команда для уведомлений (остается без изменений)
#[tauri::command]
fn show_notification(app: tauri::AppHandle, title: String, body: String) {
    let identifier = &app.config().tauri.bundle.identifier;
    Notification::new(identifier)
        .title(title)
        .body(body)
        .show()
        .unwrap();
}

// Новая функция, которая отправляет событие во фронтенд
fn toggle_window(window: &Window) {
    // Мы не показываем/прячем окно здесь. Мы просто говорим фронтенду, что пора.
    window.emit("toggle-window", ()).unwrap();
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Получаем главное окно
            let window = app.get_window("main").unwrap();
            // Прячем его при старте
            window.hide()?;

            // РЕГИСТРИРУЕМ ГЛОБАЛЬНУЮ ГОРЯЧУЮ КЛАВИШУ
            let mut shortcut_manager = app.global_shortcut_manager();
            // Создаем копию хендла окна для замыкания
            let window_clone = window.clone();
            shortcut_manager.register("Alt+Space", move || {
                // При нажатии вызываем нашу функцию, которая отправит событие
                toggle_window(&window_clone);
            })?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            show_notification
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}