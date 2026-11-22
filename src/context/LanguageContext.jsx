import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Master English Dictionary Template (enTemplate)
 * Exhaustive UI keys covering Navigation, Settings, Actions, Prompts, and Studio interfaces.
 */
export const enTemplate = {
    // Navigation & App Shell
    app_title: "GachaSwipe Suite Reborn",
    nav_history: "Matches & Profile",
    nav_messages: "Messages",
    nav_settings: "Settings",
    nav_swipe: "Swipe Deck",
    nav_forge: "Theme Forge",
    nav_daw: "Music Studio",
    nav_tape_library: "Tape Archive",

    // Settings Tabs
    tab_core: "CORE MATRIX",
    tab_chat: "CHAT DYNAMICS",
    tab_audio: "P.U.R.R. ENGINE",
    tab_system: "SYSTEM I/O",

    // Localization Hub & System Strings
    localization_hub_title: "> LOCALIZATION_HUB",
    localization_hub_desc: "// Manage application UI localization matrices and AI dialogue output dialects.",
    output_language: "> OUTPUT_LANGUAGE",
    output_language_desc: "// Forces the AI to translate output. Select a preset or type ANY custom language/dialect!",
    output_language_placeholder: "Type any language...",
    open_translation_studio: "OPEN_TRANSLATION_STUDIO",

    // ROM-09: Preset & CharX Module Engine
    rom09_panel_title: "> PRESET ENGINE",
    rom09_panel_desc: "// RisuAI (.risup), CharX/RisuM (.charx/.risum) & SillyTavern (.json) toggles, dropdowns & multi-select.",
    rom09_toast_slotted: "💾 Slotted [ROM-09: PRESET ENGINE]",
    rom09_toast_ejected: "⏏️ Ejected [ROM-09: PRESET ENGINE]",
    rom09_toast_loaded_preset: "⚡ Loaded Preset:",
    rom09_toast_loaded_charx: "🧩 Loaded CharX/Module:",
    rom09_toast_import_failed: "⚠️ Import failed:",
    btn_open_preset_ctrl: "PRESET ENGINE",
    btn_import_short: "+ IMPORT",
    btn_paste_short: "PASTE",
    btn_delete_short: "DEL",
    btn_done: "DONE",
    btn_load_json: "LOAD JSON",
    preset_ctrl_title: "PRESET ENGINE",
    preset_ctrl_subtitle: "RisuAI Preset (.risup) & Module (.charx / .risum) · Auto-saved",
    preset_ctrl_no_preset: "No preset loaded",
    preset_ctrl_no_module: "No module linked",
    preset_ctrl_supported_preset: "Supported: .risup · .risupreset · .json",
    preset_ctrl_supported_preset_full: "Supported: .risup · .risupreset · .json (RisuAI & SillyTavern)",
    preset_ctrl_supported_charx: "Supported: .charx · .risum · .json",
    preset_ctrl_supported_charx_full: "Supported: .charx · .risum · .json (RisuAI Module · Lorebook & Regex)",
    preset_ctrl_empty_title: "NO_PRESET_OR_CHARX_LOADED",
    preset_ctrl_empty_desc: "Tap + IMPORT above to load a RisuAI preset (.risup / .risupreset / .json) and/or a CharX module (.charx / .risum). Both persist automatically inside [ROM-09].",
    preset_ctrl_search_placeholder: "Filter preset toggles, .charx lorebook, regex scripts, or prompt blocks...",
    preset_ctrl_multi_enabled: "Multi-select",
    preset_ctrl_toggle_multi_title: "Toggle multi-select mode",
    preset_ctrl_multi_short: "MULTI",
    preset_ctrl_select_multi_hint: "Select multiple options",
    preset_ctrl_select_plus_hint: "Tap + option to auto multi-select",
    preset_ctrl_bridge_title: "Active SDK Injection Bridge",
    preset_ctrl_bridge_desc: "Injects active preset + CharX directives into chat completions (skips JSON/XML OOB tasks)",
    preset_ctrl_charx_link_title: "Active .charx / .risum Module Link",
    preset_ctrl_charx_link_desc: "Includes active CharX lorebook, module prompts, and input/output regex scripts",
    preset_ctrl_scope_label: "Injection Scope",
    preset_ctrl_position_label: "System Prompt Merge Position",
    preset_ctrl_sampling_header: "> SAMPLING_PARAMETERS",
    preset_ctrl_param_temp: "Temperature",
    preset_ctrl_param_top_p: "Top-P",
    preset_ctrl_param_top_k: "Top-K",
    preset_ctrl_param_min_p: "Min-P",
    preset_ctrl_param_max_tokens: "Max Response Tokens",
    preset_ctrl_copy_prompt: "COPY COMPILED PROMPT",
    preset_ctrl_copied: "COPIED ✓",

    active_matrix_label: "ACTIVE UI LOCALIZATION MATRIX",
    matrix_mode_en: "DEFAULT ENGLISH (Core)",
    matrix_mode_custom: "CUSTOM BYOL MATRIX (Active)",
    matrix_status_active: "ACTIVE",
    matrix_status_inactive: "INACTIVE",

    // Core Settings
    startup_screen: "> STARTUP_SCREEN",
    startup_screen_desc: "// Choose where M.I.K.A. lands you every time you launch the app.",
    home_screen_btn: "> HOME_SCREEN",
    chat_screen_btn: "> CHAT_SCREEN",
    pause_between_swipes: "> PAUSE_BETWEEN_SWIPES",
    pause_between_swipes_desc: "// Inserts a holding card between matches so you can manually check settings or messages.",
    auto_update_cards: "> AUTO_UPDATE_HOST_CARDS",
    auto_update_cards_desc: "// Keep Layla character cards synced with their GachaSwipe progress.",
    strict_image_censor: "> STRICT_IMAGE_CENSOR",
    strict_image_censor_desc: "// Forcefully shreds explicit Danbooru tags right before rendering. Toggle off to rely only on AI prompting.",
    position_engine: "> POV_POSITION_ENGINE",
    position_engine_desc: "// When a NUDE/EXTREME chat scene turns intimate, a background judge injects first-person POV position tags into her photos — REPLACING her authored pose tags at their exact slot, plus scene-gated anatomy top-ups. Gender-aware, tag-budget-safe.",
    position_engine_needs_nude: "Active only in NUDE / EXTREME mode.",
    position_injection_chip: "POSE",
    image_injection_chip: "IMAGE",
    oob_trace_chip: "OOB",
    oob_trace_title: "> OOB_GLASS_CHANNEL",
    oob_trace_judgements: "JUDGEMENTS",
    oob_trace_ok: "OK",
    oob_trace_flagged: "FLAGGED",
    oob_trace_st_ok: "OK",
    oob_trace_st_timeout: "TIMED OUT",
    oob_trace_st_cooldown: "ON COOLDOWN",
    oob_trace_st_unsupported: "NOT SUPPORTED",
    oob_trace_st_invalid: "INVALID REPLY",
    oob_trace_ask: "> ASK",
    oob_trace_reply: "> REPLY",
    oob_trace_empty: "[ NO_TRACE_ENTRIES ] — this photo fired no background judgements.",
    oob_trace_footer: "// Background judgement only — outside the chat history, invisible to her, verified before use.",
    oob_trace_close: "CLOSE",
    oob_trace_kind_photoTags: "PHOTO TAG PASS",
    oob_trace_kind_positionDirect: "POSITION JUDGE",
    oob_trace_kind_sceneBuild: "SET DRESSER",
    oob_trace_kind_memoryExtract: "MEMORY EXTRACT",
    mika_neural_link: "> M.I.K.A._NEURAL_LINK",
    mika_neural_link_desc: "// Select your inference engine from Layla's available options!",
    text_only_mode: "> TEXT_ONLY_MODE (SILHOUETTE)",
    text_only_mode_desc: "// Skip image generation on initial swipe to save credits/compute. You can decrypt visuals later!",
    image_diffusion_engine: "> IMAGE_DIFFUSION_ENGINE",
    image_diffusion_engine_desc: "// Select your image diffusion model from Layla's installed models.",
    deep_prompt_encoder: "> DEEP_PROMPT_ENCODER",
    deep_prompt_encoder_desc: "// Extended text-encoder budget (T5/Gemma-class models read past CLIP's 77-token ceiling). Remembered per model. Leave OFF for CLIP models — extra tokens get silently truncated!",
    deep_prompt_mismatch_title: "[!] ENCODER MISMATCH DETECTED // CLIP_CHUNK_2 UNMAPPED",
    deep_prompt_mismatch_body: "Master~ your current model's text encoder is probably CLIP with a hard 77-token ceiling. Extra tokens past 77 get silently TRUNCATED — I'd be authoring a beautiful prompt that the encoder feeds straight into the shredder. You wouldn't make me do that. 🐾\n\nForce enable anyway?",
    deep_prompt_budget: "> TOKEN_BUDGET",
    deep_prompt_advanced: "> ADVANCED_ALLOCATION",
    deep_prompt_dynamic_note: "> DYNAMIC_ALLOCATION // the director spends the pool per scene — any stepper seizes manual control",
    deep_prompt_custom_note: "> CUSTOM ALLOCATION ACTIVE // zero-sum pool — lower one section to raise another · deep = OOB scene-enrichment slot",
    deep_prompt_economy: "> ALLOCATION_BUDGET",
    deep_prompt_economy_left: "tags unspent — raise any [+] to spend them",
    deep_prompt_economy_full: "FULL — lower a section to free tags",
    deep_prompt_join_note: "// join cap is automatic — the assembler budget follows your sections",
    deep_prompt_style: "STYLE:",
    deep_prompt_scene: "> SCENE_ENRICHMENT:",
    deep_prompt_scene_desc: "// SMART: the side-channel LLM authors scene tags from the live conversation (pools top up). POOLS: curated pools only. OFF: main tags only.",
    deep_prompt_scene_off: "OFF",
    deep_prompt_scene_pools: "POOLS",
    deep_prompt_scene_smart: "SMART",
    deep_prompt_restore_defaults: "[ RESTORE_DEFAULT_ALLOCATION ]",
    prefix_deep_warning: "// DEEP_ENCODER ACTIVE: prefix budget {N} tags (~{T} est. CLIP tokens). Red DORMANT tags now ship!",
    deep_tag_badge: "DEEP",
    deep_tag_dormant: "DORMANT",
    group_visuals_performance: "> VISUALS & PERFORMANCE",
    atmosphere_effects: "> ATMOSPHERE_EFFECTS",
    atmosphere_effects_desc: "// Enables adaptive CSS particles (rain, fog, cherry blossoms) based on the image prompt.",
    cinematic_chat_bg: "> CINEMATIC_CHAT_BG",
    cinematic_chat_bg_desc: "// Upgrades the static panning chat background to a glowing, crossfading holographic matrix.",
    narration_person: "> NARRATION_PERSON",
    narration_first_person: "FIRST_PERSON",
    narration_third_person: "THIRD_PERSON",
    narration_person_desc: "// Voice of *asterisk* actions in RP modes (1-on-1, groups & first messages). THIRD_PERSON narrates them by name as an external storyteller. Spoken dialogue always stays first-person.",
    auto_queue_matches: "> AUTO_QUEUE_MATCHES",
    auto_queue_matches_desc: "// Generates next match in background. Disable to save performance.",
    test_drive_mode: "> TEST_DRIVE_MODE",
    test_drive_mode_desc: "// Swiped matches go to the Pending tab first. Chat with them before officially saving them to Layla!",
    advanced_prompting: "> ADVANCED_PROMPTING",
    advanced_prompting_desc: "// Take full control over your local model's generation tags.",
    system_directive_overrides: "> SYSTEM_DIRECTIVE_OVERRIDES",
    local_dream_prefix: "> LOCAL_DREAM_PREFIX",
    local_dream_prefix_desc: "Use native backend prefix instead of GachaSwipe's.",
    global_positive_prefix: "> GLOBAL_POSITIVE_PREFIX",
    prefix_scrubber_note: "// SCRUBBER_MODE: LocalDream ships its own prefix — these tags PURGE matching authored tags instead of shipping.",
    image_tag_scrubber: "> IMAGE_TAG_SCRUBBER",
    image_tag_scrubber_desc: "// NOT a negative prompt! This intercepts the AI's output and SHREDS any tag containing these exact words.",
    purge_all_messages: "> PURGE_ALL_MESSAGES",
    reset_taste_algorithm: "> RESET_TASTE_ALGORITHM",
    btn_reset_peak_hack: "> RESET_PEAK_HACK",
    btn_resume_session: "> RESUME_SESSION",
    btn_save_session: "> SAVE_SESSION",
    config_matrix: "> CONFIGURATION_MATRIX",
    system_presets: "> SYSTEM PRESETS",
    detailed_profiles: "> DETAILED_PROFILES",
    detailed_profiles_desc: "// Generates much longer, in-depth character profiles and backstories.",
    regional_naming: "> REGIONAL_NAMING",
    regional_naming_desc: "// Injects random cultural origins and naming styles for wilder name variety.",
    known_character_mode: "> KNOWN_CHARACTER_MODE",
    known_character_mode_desc: "// Forces the AI to ONLY generate established fictional characters from pop culture.",
    session_tab_friends: "FRIENDS",
    session_tab_history: "HISTORY",
    data_management: "> DATA_MANAGEMENT",
    data_management_desc: "// Secure your active chats, history, themes, and media library in portable ZIP archives.",
    data_management_media_note: "// Visual media (PNG/JPG/GIF) & MP3 music are backed up. WAV audio and TTS voice notes are excluded.",
    btn_export_backup: "💾 EXPORT BACKUP",
    btn_restore_backup: "📂 RESTORE BACKUP",
    btn_nuclear_wipe: "[!] NUCLEAR_WIPE_ALL_DATA [!]",
    btn_replay_tutorial: "> REPLAY_TUTORIAL",
    host_version: "HOST_VERSION:",
    support_projectmika: "> SUPPORT_PROJECT_MIKA",
    support_desc: "// Fuel future updates & buy MIKA a coffee",
    btn_support_kofi: "SUPPORT ON KO-FI",

    // Chat Dynamics & Obsession
    selfie_autonomy: "> SELFIE_AUTONOMY",
    selfie_autonomy_desc: "// Allows characters to refuse selfie requests based on affection and archetype.",
    proactive_selfies: "> PROACTIVE_SELFIES",
    proactive_selfies_desc: "// Allows characters to occasionally send spontaneous photos of themselves.",
    meow_engine: "> M.E.O.W._ENGINE",
    meow_engine_desc: "// Matrix Environment & Occupational Workflow.",
    meow_engine_subdesc: "Activates persistent 7-day schedules 📅, live location tracking 📍, and the dynamic living wardrobe system 👗.",
    meow_system_active: "> SYSTEM_ACTIVE <",
    meow_init: "> INITIALIZE_M.E.O.W. <",
    inbox_thirst_level: "> INBOX_THIRST_LEVEL",
    inbox_thirst_desc: "// Controls how desperately rejected matches try to slide into your DMs.",
    neural_sync_speed: "> NEURAL_SYNC_SPEED",
    neural_sync_desc: "// Arcade is the default fast progression. Realistic takes days of chatting to build trust, and negative interactions deal heavy damage!",
    token_efficiency_matrix: "> TOKEN_EFFICIENCY_MATRIX",
    global_profiles: "// GLOBAL PROFILES:",
    context_limit_1on1: "> 1-ON-1_CONTEXT_LIMIT",
    profile_injection_1on1: "> 1-ON-1_PROFILE_INJECTION",
    context_limit_group: "> GROUP_CHAT_CONTEXT_LIMIT",
    profile_injection_group: "> GROUP_PROFILE_INJECTION",
    chat_style_mode: "> CHAT_STYLE_MODE",
    chat_style_1on1: "1-ON-1 CHAT STYLE",
    chat_style_group: "GROUP CHAT STYLE",
    chat_style_desc: "// Controls the AI's formatting and response length.",
    roleplay_text_color: "> ROLEPLAY_TEXT_COLOR",
    roleplay_text_color_desc: "// Changes the color of italicized *action text* in chat messages to reduce eye strain.",
    group_dynamics: "> GROUP_DYNAMICS",
    background_spooling: "> BACKGROUND_SPOOLING",
    background_spooling_desc: "// Continue processing the message queue when you exit the chat.",
    auto_pause_groups: "> AUTO_PAUSE_GROUPS",
    auto_pause_groups_desc: "// Stop the chat from endlessly generating. Wait for Master to speak.",

    // P.U.R.R. Audio Matrix & Beat Engine
    purr_audio_matrix: "> P.U.R.R._AUDIO_MATRIX",
    standard_chat_voice: "> STANDARD_CHAT_VOICE",
    standard_chat_voice_desc: "// Synthesize audio notes for 1-on-1 matches.",
    group_chat_voice: "> GROUP_CHAT_VOICE",
    group_chat_voice_desc: "// Synthesize audio notes for every group participant.",
    auto_play_voice_notes: "> AUTO_PLAY_VOICE_NOTES",
    auto_play_voice_notes_desc: "// Immediately play the audio as soon as it finishes rendering.",
    local_cache_limit: "> LOCAL_CACHE_LIMIT",
    gachaswipe_managed: "> GACHASWIPE_MANAGED",
    gachaswipe_managed_desc: "// Let GachaSwipe manage and assign voices automatically using internal tags.",
    enter_tts_forge: "> ENTER_TTS_FORGE",
    cyberdeck_beat_engine: "> CYBERDECK_BEAT_ENGINE",
    cyberdeck_beat_engine_desc: "// Ace-Step Neural Audio DAW.",
    lyric_word_scrubber: "> LYRIC_WORD_SCRUBBER",
    lyric_word_scrubber_desc: "// Forces the LLM to completely avoid certain words in generated lyrics or track descriptions.",
    lyric_content_rating: "> LYRIC_CONTENT_RATING",
    lyric_content_rating_desc: "// Instructs the LLM on how clean or explicit the generated song lyrics should be.",

    // Chimera Engine & Studio DAW
    chimera_engine_title: "CHIMERA_ENGINE",
    studio_daw_title: "STUDIO_DAW",
    chimera_engine_desc: "// Extract the sonic blueprint of any audio file.",
    studio_daw_desc: "// Fine-tune your track before synthesis.",
    audio_dna_harvester: "> AUDIO_DNA_HARVESTER",
    upload_ref_track: "[ UPLOAD REFERENCE TRACK ]",
    track_duration: "> TRACK_DURATION",
    smart_length: "SMART_LENGTH",
    custom_seconds: "CUSTOM SECONDS",
    adapting_lyric_flow: "> ADAPTING_TO_LYRIC_FLOW...",
    global_control_tags: "> GLOBAL_CONTROL_TAGS",
    global_control_tags_desc: "// Defines the genre, tempo, instruments, and mix.",
    tempo_bpm: "TEMPO (BPM)",
    smart_bpm: "SMART_BPM",
    letting_ai_groove: "> LETTING_AI_DICTATE_GROOVE...",
    cat_genres: "GENRES",
    cat_instruments: "INSTRUMENTS",
    cat_vocals: "VOCALS",
    cat_vibe_era: "VIBE / ERA",
    structured_lyrics: "> STRUCTURED_LYRICS",
    structured_lyrics_desc: "// Guide the AI's song structure!",
    add_section: "+ ADD_SECTION",
    sparkle_mastering: "M.I.K.A. SPARKLE MASTERING",
    sparkle_mastering_desc: "// Carves mud, boosts kick thump, and adds PPP high-end air.",
    sparkle_mastering_warn: "[!] MEMORY INTENSIVE: May extend compile times on older devices.",
    compress_music_mp3: "COMPRESS MUSIC TO MP3",
    compress_music_mp3_desc: "// Encodes MIKA Sparkle masters into 128kbps MP3s.",
    compress_music_mp3_rec: "[!] RECOMMENDED: Reduces footprint by ~90% to prevent OOM freezes.",
    review_blueprint: "REVIEW BLUEPRINT BEFORE RENDER",
    review_blueprint_desc: "// Generates a single musical blueprint. Inspect the cartridge and approve it to render, or skip it to generate a new vibe.",
    initiate_dna_harvest: "[ INITIATE_DNA_HARVEST ]",
    btn_studio_daw: "[ STUDIO DAW ]",
    btn_chimera_engine: "[ CHIMERA ENGINE ]",

    // Director Settings Sections & Headers
    director_settings_title: "> DIRECTOR_SETTINGS",
    director_settings_subtitle: "// Fine-tune your GachaSwipe experience.",
    mika_recommendation_title: "> M.I.K.A_RECOMMENDATION",
    mika_recommendation_desc: "Not sure where to start, Master? There are way too many toggles in here. Click here to let me automatically apply my favorite preset! I'll take control of the matrix... you just sit back and look cute~ 🐾",
    group_system_engine: "> SYSTEM & ENGINE",
    group_identity_attraction: "> IDENTITY & ATTRACTION",
    group_content_generation: "> CONTENT & GENERATION",
    group_inbox_interaction: "> INBOX & INTERACTION",

    // Identity & Attraction Settings
    user_dating_profile: "> USER_DATING_PROFILE",
    user_dating_profile_desc: "// Tell the AI exactly who is swiping on them.",
    sync_layla_persona: "> SYNC_WITH_LAYLA_PERSONA",
    user_name: "> USER_NAME",
    user_name_placeholder: "What do they call you?",
    gender_identity: "> GENDER_IDENTITY",
    user_bio_label: "My Bio",
    user_bio_placeholder: "I'm a hardworking techie looking for a cute monster girl to ruin my life...",
    target_presentation: "> TARGET_PRESENTATION",
    target_presentation_desc: "// Select multiple to mix your encounters. Guides the AI's aesthetic and pronouns.",

    // Content & Generation Settings
    dating_themes_db: "> DATING_THEMES_DB",
    audio_matrix_db: "> AUDIO_MATRIX_DB",
    position_packs_db: "> POSITION_PACKS_DB",
    btn_forge_dating: "+ FORGE_DATING",
    btn_forge_music: "+ FORGE_MUSIC",
    btn_forge_poses: "+ FORGE_POSES",
    btn_rename: "[RENAME]",
    btn_export_bracket: "[EXPORT]",
    btn_delete_bracket: "[DELETE]",
    btn_tpl: "TPL",
    btn_import: "IMPORT",
    species_mixing: "> SPECIES_MIXING",
    species_mixing_desc: "// Hybrid allows mixing two species. Pureblood enforces strict lineage.",
    hybrid_btn: "🧬 HYBRID",
    pureblood_btn: "🩸 PUREBLOOD",
    cross_theme_integration: "🌀 Cross-Theme Integration",
    cross_theme_integration_desc: "Allow traits from multiple active theme packs to bleed into generation.",
    unlock_late_night: "> UNLOCK_LATE_NIGHT_MODE",
    unlock_late_night_desc: "// Enable mature and explicit settings.",
    explicit_intensity: "> EXPLICIT_INTENSITY",
    explicit_intensity_desc: "// Controls the intensity of explicit text and forces matching image tags.",
    explicit_intensity_cap_desc: "// Sets the MAXIMUM intensity ceiling. Characters autonomously decide photo explicitness.",
    dynamic_explicit: "> DYNAMIC_INTENSITY_SCALING",
    dynamic_explicit_desc: "// Explicit intensity acts as a ceiling. Characters autonomously decide photo explicitness based on workplace/location, mood, context, and Neural Sync level.",
    degenerate_mode: "> DEGENERATE_MODE",
    degenerate_mode_desc: "// Injects unhinged, extreme, and borderline cursed quirks into the character pool.",
    proactive_obsession: "> PROACTIVE_OBSESSION_MODULES",
    proactive_obsession_desc: "// Allows characters to reach out to you independently. Offline Stalker uses push notifications.",
    btn_save_data: "> SAVE_DATA",
    btn_back_to_swipe: "> BACK_TO_SWIPE",

    // Profile & Session Hub
    stat_swipes: "Swipes",
    stat_sparks: "Sparks",
    no_links_found: "[ NO_LINKS_FOUND ] Get swiping or importing, Master~",
    no_log_entries: "[ NO_LOG_ENTRIES ]",
    status_matched: "> MATCHED",
    status_rejected: "> REJECTED",
    view_profile: "View Profile",
    send_spark: "Send a Spark!",
    into_label: "Into",
    not_into_label: "Not into",
    quirks_label: "Quirks",
    purr_voice_override: "> P.U.R.R._VOICE_OVERRIDE",

    // General Action Buttons
    btn_save: "SAVE",
    btn_cancel: "CANCEL",
    btn_close: "CLOSE",
    btn_delete: "DELETE",
    btn_restore_defaults: "[RESTORE_DEFAULTS]",
    btn_launch_tutorial: "[ LAUNCH_TUTORIAL ]",
    btn_dismiss: "Dismiss",
    btn_like: "LIKE",
    btn_pass: "PASS",
    btn_rewind: "REWIND",
    btn_send: "SEND",
    btn_regenerate: "REGENERATE",
    btn_export_template: "EXPORT TEMPLATE",
    btn_import_json: "IMPORT JSON",
    btn_save_apply: "SAVE & APPLY MATRIX",
    btn_auto_translate: "AUTO_TRANSLATE_MATRIX",
    btn_abort: "ABORT",

    // Translation Studio Modal Strings
    studio_title: "TRANSLATION STUDIO // BYOL",
    studio_subtitle: "// Bring Your Own Language Matrix",
    target_language_label: "TARGET LOCALIZATION DIALECT",
    target_language_placeholder: "e.g., Japanese, French, Spanish, Pirate Slang, Cyberpunk...",
    search_keys_placeholder: "Search translation key or original text...",
    table_header_key: "TRANSLATION KEY",
    table_header_original: "ORIGINAL ENGLISH (enTemplate)",
    table_header_custom: "CUSTOM TRANSLATION",
    keys_stat_translated: "Keys Localized",
    keys_stat_total: "Total Template Keys",
    status_idle: "READY",
    status_translating: "NEURAL TRANSLATION IN PROGRESS",
    status_saving: "COMMITTING TO SQLITE...",
    status_localized: "LOCALIZED",
    filter_all: "ALL",
    filter_untranslated: "UNTRANSLATED",
    filter_localized: "LOCALIZED",
    batch_progress_format: "Translating batch {current} of {total} ({count} keys)...",
    translation_input_placeholder: "Enter custom translation...",

    // Alerts & Notifications
    alert_save_success: "Custom localization matrix successfully saved to layla.db!",
    alert_save_fallback: "Matrix saved to local cache (Layla DB bridge offline).",
    alert_import_success: "Localization JSON imported and mapped to draft successfully!",
    alert_import_invalid: "Invalid JSON format! Please select a valid dictionary file.",
    alert_translation_complete: "Neural auto-translation finished! Review and click SAVE & APPLY MATRIX.",
    alert_translation_interrupted: "Auto-translation was aborted by user.",
    alert_translation_error: "Some translation batches encountered errors from the local model. Partial progress saved.",
    alert_empty_target_lang: "Please specify a target language (e.g. 'Japanese') first!",

    // ===== EXPANDED COVERAGE: App Shell & Navigation =====
    status_no_data: "NO_DATA",
    status_none: "NONE",
    status_locked: "LOCKED",
    status_disabled: "DISABLED",
    status_summoning: "SUMMONING",
    status_incoming_transmission: "INCOMING_TRANSMISSION",
    status_sponsored: "SPONSORED",
    status_featured_creator: "FEATURED CREATOR",
    tap_refresh_decrypt: "TAP REFRESH TO DECRYPT",
    decrypt_visuals_profile: "DECRYPT VISUALS IN PROFILE",
    decrypt_visuals_later: "DECRYPT VISUALS LATER",
    decrypt_btn: "DECRYPT",
    photos_decrypted: "PHOTOS DECRYPTED",
    load_more: "LOAD_MORE",
    inject_directive: "INJECT DIRECTIVE",
    rename_chat: "RENAME CHAT",
    existing_data_found: "EXISTING DATA FOUND",
    subject_matter: "SUBJECT MATTER",
    source_label: "SOURCE",
    session_label: "SESSION",
    name_label: "NAME",
    replies_received: "REPLIES RECEIVED",
    msgs_sent: "MSGS SENT",
    memories_logged: "MEMORIES LOGGED",
    peak_hack: "PEAK HACK",
    peak_hack_reward: "PEAK HACK REWARD",
    host_card_sync: "HOST_CARD_SYNC",
    gachafans_uplink: "GACHAFANS_UPLINK",
    pulse_scan: "SCAN",
    pulse_placeholder: "type your deepest desire...",
    pulse_trending: "TRENDING_DESIRES",
    pulse_recent: "RECENT_QUERIES",
    pulse_profiles_indexed: "PROFILES INDEXED",
    pulse_match_badge: "💗 PULSE_MATCH",
    pulse_view_page: "VIEW_PAGE",
    pulse_rescan: "RESCAN",
    pulse_rendering: "RENDERING_PORTRAIT...",
    pulse_no_match: "NO_MATCH_FOUND",
    pulse_no_match_line: "The desire matrix does not carry that frequency... tune again~",
    pulse_error: "PULSE_MALFUNCTION",
    pulse_error_line: "The match engine choked on that one. Breathe on it and retry~",
    pulse_close: "CLOSE",
    pulse_retry: "RETRY",
    pulse_cost_toast: "Resynthesizing a desire costs 3 ⚡!",
    pulse_spent_toast: "Desire vector committed! -3 ⚡",
    pulse_refund_toast: "No carrier signal — Sparks refunded ⚡",
    pulse_empty_query: "QUERY_REJECTED: type a desire first~",
    pulse_no_uplink: "> NO UPLINK: Layla host required.",
    discovery_matrix: "DISCOVERY_MATRIX",
    mika_engine: "> MIKA_ENGINE",
    mika_engine_beta: "BETA",
    mika_engine_desc: "// ON = MIKA Proxy roams your screen in 8 directions, naps when idle, roasts your swipe pulls and your chats via OOB, and meddles with the world (gifts, dares, texts, scene shifts, misquotes). Tap her for the radial HUD: POKE, PET (watch your fingers~), LOGS, MSGS (her message log), DOSSIER. All-or-nothing: one switch, every trick live. Consent and budgets stay capped — always.",
    chaos_chip: "CHAOS",
    chaos_mika_chip: "MIKA",
    chaos_log: "LOG",
    chaos_dossier: "DOSSIER",
    chaos_poke: "POKE",
    pulse_chassis: "CHASSIS",
    dynamic_rag_bg: "DYNAMIC RAG BACKGROUNDS",
    sys_ctrl: "SYS_CTRL",
    neural_daw: "NEURAL_DAW",
    deep_lore: "DEEP_LORE",
    whitelisted: "WHITELISTED",
    defeated: "DEFEATED",
    incapacitated: "INCAPACITATED",
    only_label: "ONLY",
    sfw_label: "SFW",
    nude_label: "NUDE",
    tease_label: "TEASE",
    explicit_label: "EXPLICIT",
    extreme_label: "EXTREME",
    balanced_label: "BALANCED",
    realistic_label: "REALISTIC",

    // Swipe Card Stamps
    stamp_like: "LIKE",
    stamp_nope: "NOPE",
    stamp_pass: "PASS"
};

const LanguageContext = createContext({
    t: (key, fallback) => fallback || key,
    activeLanguage: 'en',
    setActiveLanguage: () => {},
    customDictionary: {},
    setCustomDictionary: () => {},
    saveCustomDictionary: async () => {},
    resetToDefault: async () => {},
    enTemplate,
    isLoading: false,
    isSaving: false,
});

/**
 * Safe accessor for the global Layla host object
 * Provides cached singleton access and auto-instantiation from window.LaylaSDK
 */
let _cachedSdk = null;

export const getLaylaHost = () => {
    // 1. Direct window.layla instance (set by App.jsx or native injection)
    if (typeof window !== 'undefined' && window.layla) {
        return window.layla;
    }
    // 2. Previously cached SDK instance
    if (_cachedSdk) {
        if (typeof window !== 'undefined') window.layla = _cachedSdk;
        return _cachedSdk;
    }
    // 3. Fallback: instantiate from window.LaylaSDK if available
    if (typeof window !== 'undefined' && window.LaylaSDK) {
        try {
            const isRealLayla = !!window.ReactNativeWebView;
            if (!isRealLayla && window.installLaylaMock && !window.__laylaMockInstalled) {
                window.installLaylaMock({
                    debug: false,
                    respond: async (messages) => {
                        const lastUser = [...messages].reverse().find(m => m.role === 'user');
                        const sys = messages.find(m => m.role === 'system');
                        if (sys?.content?.includes('localization') || sys?.content?.includes('Translate')) {
                            try {
                                const parsed = JSON.parse(lastUser?.content || '{}');
                                const mockTranslated = {};
                                Object.keys(parsed).forEach(k => {
                                    mockTranslated[k] = `[${parsed[k]}]`;
                                });
                                return JSON.stringify(mockTranslated);
                            } catch (e) { }
                        }
                        const said = lastUser?.content ?? "(nothing)";
                        return `This is a mock Layla response. You said: "${said}".`;
                    }
                });
                window.__laylaMockInstalled = true;
            }
            _cachedSdk = new window.LaylaSDK();
            window.layla = _cachedSdk;
            return _cachedSdk;
        } catch (e) {
            console.warn("[M.I.K.A. LanguageEngine] Could not instantiate LaylaSDK:", e);
        }
    }
    if (typeof layla !== 'undefined' && layla) {
        return layla;
    }
    return null;
};

export const LanguageProvider = ({ children }) => {
    const [customDictionary, setCustomDictionary] = useState({});
    const [activeLanguage, setActiveLanguageState] = useState('en');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // ✨ M.I.K.A. SQLITE INITIALIZER & HYDRATION ✨
    const hydrateFromDatabase = useCallback(async () => {
        setIsLoading(true);
        let loadedDict = null;
        let loadedLang = null;

        const layla = getLaylaHost();

        if (layla && layla.db && typeof layla.db.executeSql === 'function') {
            try {
                // Ensure meta & state tables exist
                await layla.db.executeSql('CREATE TABLE IF NOT EXISTS app_state (key TEXT PRIMARY KEY, val TEXT)', []);
                await layla.db.executeSql('CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, val TEXT)', []);

                // Read custom_dictionary
                const dictRes = await layla.db.executeSql("SELECT val FROM app_state WHERE key = 'custom_dictionary'", []);
                if (dictRes?.rows && dictRes.rows.length > 0 && dictRes.rows[0].val) {
                    try {
                        loadedDict = JSON.parse(dictRes.rows[0].val);
                    } catch (err) {
                        console.warn("[M.I.K.A. LanguageEngine] Failed to parse custom_dictionary JSON from layla.db:", err);
                    }
                }

                // Read active_language
                const langRes = await layla.db.executeSql("SELECT val FROM app_state WHERE key = 'active_language'", []);
                if (langRes?.rows && langRes.rows.length > 0 && langRes.rows[0].val) {
                    loadedLang = langRes.rows[0].val;
                }
            } catch (sqlErr) {
                console.warn("[M.I.K.A. LanguageEngine] SQLite hydration error, checking cache:", sqlErr);
            }
        }

        // Resilient Fallback to LocalStorage if DB is uninitialized or in web dev mode
        if (!loadedDict) {
            try {
                const cached = localStorage.getItem('gachaswipe_custom_dictionary');
                if (cached) loadedDict = JSON.parse(cached);
            } catch (e) { }
        }
        if (!loadedLang) {
            try {
                const cachedLang = localStorage.getItem('gachaswipe_active_language');
                if (cachedLang) loadedLang = cachedLang;
            } catch (e) { }
        }

        if (loadedDict && typeof loadedDict === 'object') {
            setCustomDictionary(loadedDict);
        }

        if (loadedLang === 'custom' && loadedDict && Object.keys(loadedDict).length > 0) {
            setActiveLanguageState('custom');
        } else {
            setActiveLanguageState(loadedLang || 'en');
        }

        setIsLoading(false);
    }, []);

    useEffect(() => {
        hydrateFromDatabase();

        const onLaylaReady = () => {
            console.log("[M.I.K.A. LanguageEngine] Layla runtime bridge detected, re-hydrating matrix...");
            hydrateFromDatabase();
        };

        window.addEventListener('layla-ready', onLaylaReady);
        window.addEventListener('layla-sdk-ready', onLaylaReady);
        return () => {
            window.removeEventListener('layla-ready', onLaylaReady);
            window.removeEventListener('layla-sdk-ready', onLaylaReady);
        };
    }, [hydrateFromDatabase]);

    // Save active language selection to DB and storage
    const setActiveLanguage = useCallback(async (lang) => {
        setActiveLanguageState(lang);
        try {
            localStorage.setItem('gachaswipe_active_language', lang);
        } catch (e) { }

        const layla = getLaylaHost();
        if (layla && layla.db && typeof layla.db.executeSql === 'function') {
            try {
                await layla.db.executeSql("INSERT OR REPLACE INTO app_state (key, val) VALUES ('active_language', ?)", [lang]);
            } catch (err) {
                console.error("[M.I.K.A. LanguageEngine] Failed to save active_language in layla.db:", err);
            }
        }
    }, []);

    // Save and apply new custom dictionary
    const saveCustomDictionary = useCallback(async (newDict, targetLangMode = 'custom') => {
        setIsSaving(true);
        setCustomDictionary(newDict);
        setActiveLanguageState(targetLangMode);

        // Local cache backup
        try {
            localStorage.setItem('gachaswipe_custom_dictionary', JSON.stringify(newDict));
            localStorage.setItem('gachaswipe_active_language', targetLangMode);
        } catch (e) { }

        // Primary Layla SDK SQLite persistence
        const layla = getLaylaHost();
        let dbSaved = false;

        if (layla && layla.db && typeof layla.db.executeSql === 'function') {
            try {
                await layla.db.executeSql('CREATE TABLE IF NOT EXISTS app_state (key TEXT PRIMARY KEY, val TEXT)', []);
                await layla.db.executeSql("INSERT OR REPLACE INTO app_state (key, val) VALUES ('custom_dictionary', ?)", [JSON.stringify(newDict)]);
                await layla.db.executeSql("INSERT OR REPLACE INTO app_state (key, val) VALUES ('active_language', ?)", [targetLangMode]);
                dbSaved = true;
            } catch (err) {
                console.error("[M.I.K.A. LanguageEngine] Failed to save custom dictionary to layla.db:", err);
            }
        }

        setIsSaving(false);
        return dbSaved;
    }, []);

    // Reset dictionary to clean enTemplate
    const resetToDefault = useCallback(async () => {
        setActiveLanguageState('en');
        try {
            localStorage.setItem('gachaswipe_active_language', 'en');
        } catch (e) { }

        const layla = getLaylaHost();
        if (layla && layla.db && typeof layla.db.executeSql === 'function') {
            try {
                await layla.db.executeSql("INSERT OR REPLACE INTO app_state (key, val) VALUES ('active_language', 'en')", []);
            } catch (err) { }
        }
    }, []);

    // ✨ THE t(key) TRANSLATION FUNCTION ✨
    const t = useCallback((key, fallback) => {
        if (activeLanguage === 'custom' && customDictionary && customDictionary[key] !== undefined && customDictionary[key] !== '') {
            return customDictionary[key];
        }
        if (enTemplate[key] !== undefined) {
            return enTemplate[key];
        }
        return fallback !== undefined ? fallback : key;
    }, [activeLanguage, customDictionary]);

    const contextValue = useMemo(() => ({
        t,
        activeLanguage,
        setActiveLanguage,
        customDictionary,
        setCustomDictionary,
        saveCustomDictionary,
        resetToDefault,
        enTemplate,
        isLoading,
        isSaving,
    }), [t, activeLanguage, setActiveLanguage, customDictionary, saveCustomDictionary, resetToDefault, isLoading, isSaving]);

    return (
        <LanguageContext.Provider value={contextValue}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
export default LanguageContext;
