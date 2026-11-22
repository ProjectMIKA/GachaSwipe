/**
 * Copyright (C) 2026 Project M.I.K.A. & Contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { NeonSelect } from './NeonSelect.jsx';
import { PresetCtrlModal } from './PresetCtrlModal.jsx';
import { PresetRomPanel } from './PresetRomPanel.jsx';

export { NeonSelect, PresetCtrlModal, PresetRomPanel };

export const PresetCtrlUI = {
    Modal: PresetCtrlModal,
    RomPanel: PresetRomPanel,
    Select: NeonSelect
};

export {
    usePresetStore,
    registerPresetSdkRef,
    ensurePresetStoreHydrated,
    hydratePresetStoreFromSdk,
    setPresetHookEnabled,
    createPresetEngineMiddleware
} from './presetStore.js';
