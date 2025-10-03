import { SpoonClient } from "@sopia-bot/core";

declare global {
    interface Window {
        $sopia: SpoonClient;
    }
}