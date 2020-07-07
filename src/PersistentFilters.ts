/*
* This program and the accompanying materials are made available under the terms of the *
* Eclipse Public License v2.0 which accompanies this distribution, and is available at *
* https://www.eclipse.org/legal/epl-v20.html                                      *
*                                                                                 *
* SPDX-License-Identifier: EPL-2.0                                                *
*                                                                                 *
* Copyright Contributors to the Zowe Project.                                     *
*                                                                                 *
*/

import * as vscode from "vscode";
import * as zowe from "@zowe/cli";
import * as nls from "vscode-nls";
import { getStringFromTypeEnum } from "./dataset/utils";
import { ZoweDatasetNodeTemplate } from "./dataset/ZoweDatasetNodeTemplate";
const localize = nls.config({messageFormat: nls.MessageFormat.file})();

/**
 * Standard persistent values handling routines
 *
 * @export
 * @class PersistentFilters
 */
export class PersistentFilters {
    /**
     * Retrieves a generic setting either in user or workspace.
     * <pre>{@code
     *  PersistentFilters.getDirectValue("Zowe Commands: Always edit") as boolean;
     * }</pre>
     * @param key - string. The attribute value that needs retrieving
     */
    public static getDirectValue(key: string): string | boolean | undefined {
        const settings: any = { ...vscode.workspace.getConfiguration() };
        return settings.get(key);
    }
    private static readonly favorites: string = "favorites";
    private static readonly searchHistory: string = "searchHistory";
    private static readonly fileHistory: string = "fileHistory";
    private static readonly sessions: string = "sessions";
    private static readonly templates: string = "templates";

    public schema: string;
    private mSearchHistory: string[] = [];
    private mFileHistory: string[] = [];
    private mSessions: string[] = [];
    private mTemplates: ZoweDatasetNodeTemplate[] = [];

    constructor(schema: string, private maxSearchHistory = 5, private maxFileHistory = 10) {
        this.schema = schema;
        this.initialize();
    }

    /*********************************************************************************************************************************************/
    /* Add functions, for adding items to the persistent settings
    /*********************************************************************************************************************************************/

    /**
     * Adds one line of search history to the local store and
     * updates persistent store. The store contains a
     * maximum number of entries as described by `maxSearchHistory`
     *
     * If the entry matches a previous entry it is removed from the list
     * at that position in the stack.
     *
     * Once the maximum capacity has been reached the last entry is popped off
     *
     * @param {string} criteria - a line of search criteria
     */
    public async addSearchHistory(criteria: string) {
        if (criteria) {
            // Remove any entries that match
            this.mSearchHistory = this.mSearchHistory.filter( (element) => {
                return element.trim() !== criteria.trim();
            });

            // Add value to front of stack
            this.mSearchHistory.unshift(criteria);

            // If list getting too large remove last entry
            if (this.mSearchHistory.length > this.maxSearchHistory) {
                this.mSearchHistory.pop();
            }
            this.updateSearchHistory();
        }
    }

    /**
     * Adds the name of one recently-edited file to the local store and
     * updates persistent store. The store contains a
     * maximum number of entries as described by `maxFileHistory`
     *
     * If the entry matches a previous entry it is removed from the list
     * at that position in the stack.
     *
     * Once the maximum capacity has been reached the last entry is popped off
     *
     * @param {string} criteria - a line of search criteria
     */
    public async addFileHistory(criteria: string) {
        if (criteria) {
            criteria = criteria.toUpperCase();
            // Remove any entries that match
            this.mFileHistory = this.mFileHistory.filter((element) => {
                return element.trim() !== criteria.trim();
            });

            // Add value to front of stack
            this.mFileHistory.unshift(criteria);

            // If list getting too large remove last entry
            if (this.mFileHistory.length > this.maxFileHistory) {
                this.mFileHistory.pop();
            }
            this.updateFileHistory();
        }
    }

    /**
     * Adds one line of session history to the local store and
     * updates persistent store.
     *
     * If the entry matches a previous entry it is removed from the list
     * at that position in the stack.
     *
     * @param {string} criteria - a session name
     */
    public async addSession(criteria: string) {
        // Remove any entries that match
        this.mSessions = this.mSessions.filter( (element) => {
            return element.trim() !== criteria.trim();
        });
        this.mSessions.push(criteria);

        // Use standard sorting
        this.mSessions.sort();
        this.updateSessions();
    }

    /**
     * Adds the name of one recently-edited file to the local store and
     * updates persistent store. The store contains a
     * maximum number of entries as described by `maxFileHistory`
     *
     * If the entry matches a previous entry it is removed from the list
     * at that position in the stack.
     *
     * @param {ZoweDatasetNodeTemplate} template - the template to add
     */
    public async addTemplate(template: ZoweDatasetNodeTemplate) {
            template.nodeLabel = template.nodeLabel.toUpperCase();

            // Remove any entries that match
            this.mTemplates = this.mTemplates.filter((element) => {
                if (element.templateName.trim() === template.templateName.trim()) {
                        return element;
                }
            });

            // Add value to front of stack
            this.mTemplates.unshift(template);
            vscode.window.showInformationMessage(localize("addTemplate.success",
                                                          "Template saved successfully. Template name: {0}, Node type: {1}",
                                                          template.templateName, getStringFromTypeEnum(template.nodeType)));

            this.updateTemplates();
    }

    /*********************************************************************************************************************************************/
    /* Get/read functions, for returning the values stored in the persistent arrays
    /*********************************************************************************************************************************************/

    /**
     * Returns the current contents of the persistent search history array
     *
     * @returns persistent array of search history items
     */
    public getSearchHistory(): string[] {
        return this.mSearchHistory;
    }

    /**
     * Returns the current contents of the persistent sessions array
     *
     * @returns persistent array of sessions and their settings
     */
    public getSessions(): string[] {
        return this.mSessions;
    }

    /**
     * Returns the current contents of the persistent recently-opened file history array
     *
     * @returns persistent array of recently-opened files
     */
    public getFileHistory(): string[] {
        return this.mFileHistory;
    }

    /**
     * Returns the current contents of the persistent favorites array
     *
     * @returns persistent array of favorited data sets, USS files, and jobs
     */
    public readFavorites(): string[] {
        if (vscode.workspace.getConfiguration(this.schema)) {
            return vscode.workspace.getConfiguration(this.schema).get(PersistentFilters.favorites);
        }
        return [];
    }

    /*********************************************************************************************************************************************/
    /* Remove functions, for removing one item from the persistent arrays
    /*********************************************************************************************************************************************/

    /**
     * Removes one session from the persistent sessions array
     *
     * @param {string} name - The name of the session to remove
     */
    public async removeSession(name: string) {
        // Remove any entries that match
        this.mSessions = this.mSessions.filter((element) => {
            return element.trim() !== name.trim();
        });
        this.updateSessions();
    }

    /**
     * Removes one file from the persistent recently-opened files array
     *
     * @param {string} name - The name of the file to remove.
     * Should be in format "[session]: DATASET.QUALIFIERS" or "[session]: /file/path", as appropriate
     */
    public async removeFileHistory(name: string) {
        const index = this.mFileHistory.findIndex((fileHistoryItem) => {
            return fileHistoryItem.includes(name.toUpperCase());
        });
        if (index >= 0) { this.mFileHistory.splice(index, 1); }
        await this.updateFileHistory();
    }

    /**
     * Removes one template from the persistent templates array
     *
     * @param {string} templateName - The name of the template to remove
     */
    public async removeTemplate(templateName: string) {
        const index = this.mTemplates.findIndex((item) => {
            if (item.templateName.toUpperCase() === templateName.toUpperCase()) {
                return item;
            }
        });
        if (index >= 0) { this.mTemplates.splice(index, 1); }
        await this.updateTemplates();
    }

    /*********************************************************************************************************************************************/
    /* Reset functions, for resetting the persistent array to empty (in the extension and in settings.json)
    /*********************************************************************************************************************************************/

    /**
     * Empties the persistent search history array
     * Sets the extension's searchHistory array to empty, and updates the array in settings.json
     *
     */
    public async resetSearchHistory() {
        this.mSearchHistory = [];
        this.updateSearchHistory();
    }

    /**
     * Empties the persistent sessions array
     * Sets the extension's sessions array to empty, and updates the array in settings.json
     *
     */
    public async resetSessions() {
        this.mSessions = [];
        this.updateSessions();
    }

    /**
     * Empties the persistent recently-opened files history array
     * Sets the extension's fileHistory array to empty, and updates the array in settings.json
     *
     */
    public async resetFileHistory() {
        this.mFileHistory = [];
        this.updateFileHistory();
    }

    /**
     * Empties the persistent templates array
     * Sets the extension's templates array to empty, and updates the array in settings.json
     *
     */
    public async resetTemplates() {
        this.mTemplates = [];
        this.updateTemplates();
    }

    /*********************************************************************************************************************************************/
    /* Update functions, for updating the settings.json file in VSCode
    /*********************************************************************************************************************************************/

    /**
     * Updates the stored favorites array in settings.json
     */
    public async updateFavorites(favorites: string[]) {
        // settings are read-only, so were cloned
        const settings: any = { ...vscode.workspace.getConfiguration(this.schema) };
        if (settings.persistence) {
            settings.favorites = favorites;
            await vscode.workspace.getConfiguration().update(this.schema, settings, vscode.ConfigurationTarget.Global);
        }
    }

    /**
     * Updates the search history array in settings.json
     */
    private async updateSearchHistory() {
        // settings are read-only, so make a clone
        const settings: any = { ...vscode.workspace.getConfiguration(this.schema) };
        if (settings.persistence) {
            settings.searchHistory = this.mSearchHistory;
            await vscode.workspace.getConfiguration().update(this.schema, settings, vscode.ConfigurationTarget.Global);
        }
    }

    /**
     * Updates the stored sessions array in settings.json
     */
    private async updateSessions() {
        // settings are read-only, so make a clone
        const settings: any = { ...vscode.workspace.getConfiguration(this.schema) };
        if (settings.persistence) {
            settings.sessions = this.mSessions;
            await vscode.workspace.getConfiguration().update(this.schema, settings, vscode.ConfigurationTarget.Global);
        }
    }

    /**
     * Updates the recently-opened file history array in settings.json
     */
    private async updateFileHistory() {
        // settings are read-only, so make a clone
        const settings: any = { ...vscode.workspace.getConfiguration(this.schema) };
        if (settings.persistence) {
            settings.fileHistory = this.mFileHistory;
            await vscode.workspace.getConfiguration().update(this.schema, settings, vscode.ConfigurationTarget.Global);
        }
    }

    /**
     * Updates the stored templates array in settings.json
     */
    private async updateTemplates() {
        // settings are read-only, so make a clone
        const settings: any = { ...vscode.workspace.getConfiguration(this.schema) };
        if (settings.persistence) {
            settings.templates = this.mTemplates;
            await vscode.workspace.getConfiguration().update(this.schema, settings, vscode.ConfigurationTarget.Global);
        }
    }

    /**
     * Initializes the search history and sessions sections by reading from a file
     */
    private async initialize() {
        let searchHistoryLines: string[];
        let sessionLines: string[];
        let fileHistoryLines: string[];
        let templateLines: ZoweDatasetNodeTemplate[];
        if (vscode.workspace.getConfiguration(this.schema)) {
            searchHistoryLines = vscode.workspace.getConfiguration(this.schema).get(PersistentFilters.searchHistory);
            sessionLines = vscode.workspace.getConfiguration(this.schema).get(PersistentFilters.sessions);
            fileHistoryLines = vscode.workspace.getConfiguration(this.schema).get(PersistentFilters.fileHistory);
            templateLines = vscode.workspace.getConfiguration(this.schema).get(PersistentFilters.templates);
        }
        if (searchHistoryLines) {
            this.mSearchHistory = searchHistoryLines;
        } else {
            this.resetSearchHistory();
        }
        if (sessionLines) {
            this.mSessions = sessionLines;
        } else {
            this.resetSessions();
        }
        if (fileHistoryLines) {
            this.mFileHistory = fileHistoryLines;
        } else {
            this.resetFileHistory();
        }
        if (templateLines) {
            this.mTemplates = templateLines;
        } else {
            this.resetTemplates();
        }
    }
}
