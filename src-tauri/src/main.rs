// 发布版本使用 Windows GUI 子系统，避免启动桌宠时额外弹出并绑定生命周期的 CMD 窗口。
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    roachpet_lib::run();
}
