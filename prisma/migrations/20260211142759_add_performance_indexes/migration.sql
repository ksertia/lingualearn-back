-- CreateIndex
CREATE INDEX `user_language_progress_userId_lastAccessedAt_idx` ON `user_language_progress`(`userId`, `lastAccessedAt`);

-- CreateIndex
CREATE INDEX `user_language_progress_languageId_status_idx` ON `user_language_progress`(`languageId`, `status`);

-- CreateIndex
CREATE INDEX `user_level_progress_userId_status_idx` ON `user_level_progress`(`userId`, `status`);

-- CreateIndex
CREATE INDEX `user_level_progress_levelId_status_idx` ON `user_level_progress`(`levelId`, `status`);

-- CreateIndex
CREATE INDEX `user_module_progress_userId_status_idx` ON `user_module_progress`(`userId`, `status`);

-- CreateIndex
CREATE INDEX `user_module_progress_moduleId_status_idx` ON `user_module_progress`(`moduleId`, `status`);

-- CreateIndex
CREATE INDEX `user_path_progress_userId_status_idx` ON `user_path_progress`(`userId`, `status`);

-- CreateIndex
CREATE INDEX `user_path_progress_pathId_status_idx` ON `user_path_progress`(`pathId`, `status`);

-- CreateIndex
CREATE INDEX `user_step_progress_userId_status_idx` ON `user_step_progress`(`userId`, `status`);

-- CreateIndex
CREATE INDEX `user_step_progress_stepId_status_idx` ON `user_step_progress`(`stepId`, `status`);
