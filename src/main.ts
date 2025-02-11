/* Changelog:
 *
 * V1.0.0 - Initial version
 * V1.1.0 - Migrated from dateformat to moment.js
 * V1.2.0 - Introduced option for linebreak after insert
 * V1.3.0 - Enter-key in the text field closes the dialog and inserts time/date stamp
 * 
 */

import { settings } from 'cluster';
import {
	App,
	ButtonComponent,
	Editor,
	Modal,
	Plugin,
	TextComponent,
	PluginSettingTab,
	Setting,
	moment,
	View
} from 'obsidian';

interface OtsPluginSettings {
	timeStampFormat: string;
	dateStampFormat: string;
	lastFormat: string;
	newLine: boolean;
	makeBold: boolean;
	extraString: string;
}

const DEFAULT_SETTINGS: OtsPluginSettings = {
	timeStampFormat: 'hh:mm:ss',
	dateStampFormat: 'YYYY-MM-DD',
	lastFormat: '',
	newLine: false,
	makeBold: false,
	extraString: ''
}

// logThreshold: 0 ... only error messages
//               9 ... verbose output
const logThreshold = 9;
const logger = (logString: string, logLevel=0): void => {if (logLevel <= logThreshold) console.log ('TimeStamper: ' + logString)};
const version = '1.3.0-0002'

export default class TimeStamperPlugin extends Plugin {
	settings: OtsPluginSettings;

	async onload() {
		logger('Loading Plugin v' + version, 1);
		logger('Loading Settings... ', 5);
		await this.loadSettings();
		logger('  Done', 5);

		this.addSettingTab(new TimeStamperSettingTab(this.app, this));

		this.addCommand({
			id: 'obsidian-custom-timestamp',
			name: 'Insert custom time/date stamp',
			editorCallback: (editor) => {
				new TimeStamperModal(this.app, editor, this.settings, this).open();
			},
		});
		

		this.addCommand({
			id: 'obsidian-fast-timestamp',
			name: 'Insert preconfigured time stamp',
			editorCallback: (editor) => {
				const now = new Date();
				const stamp = moment(now).format(this.settings.timeStampFormat);
        const stampString = (this.settings.makeBold) ? ("**" + stamp + "**" + this.settings.extraString) : stamp + this.settings.extraString;
				if (this.settings.newLine) {
					editor.replaceSelection(stampString + '\n');
					logger('new line', 9);
				}
				else {
					editor.replaceSelection(stampString);
					logger('no new line', 9);
				}
			}
		});

		this.addCommand({
			id: 'obsidian-fast-datestamp',
			name: 'Insert preconfigured date stamp',
			editorCallback: (editor) => {
				const now = new Date();
				const stamp = moment(now).format(this.settings.dateStampFormat);
				const stampString = (this.settings.makeBold) ? ("**" + stamp + "**" + this.settings.extraString) : stamp + this.settings.extraString;
				if (this.settings.newLine) {
					editor.replaceSelection(stampString + '\n');
					logger('new line', 9);
				}
				else {
					editor.replaceSelection(stampString);
					logger('no new line', 9);
				}
			}
		});
	}

	onunload() {
		logger('Bye!', 9);
	}

	async loadSettings() {
		logger('Loading Settings...', 5);
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		logger('  - timeStampFormat: ' + this.settings.timeStampFormat, 6);
		logger('  - dateStampFormat: ' + this.settings.dateStampFormat, 6);
		logger('  - lastFormat:      ' + this.settings.lastFormat, 6);
	}

	async saveSettings() {
		logger('Saving Settings...', 5);
		await this.saveData(this.settings);
		logger('  Done.');
	}

}

class TimeStamperModal extends Modal {
	constructor(app: App, editor: Editor, settings: OtsPluginSettings, plugin: Plugin) {
		super(app);
		this.editor = editor;
		this.settings = settings;
		this.plugin = plugin;
	}

	settings: OtsPluginSettings;
	editor: Editor;
	plugin: Plugin;

	onOpen() {
		const { contentEl, editor, modalEl } = this;
		const rowClass = 'row';
		const divClass = 'div';
		const _this = this;
		const doStamp = (): void => {
			const now = new Date();
			const stampFormat = formatComponent.getValue();
			const stamp = moment(now).format(stampFormat);
			const stampString = (_this.settings.makeBold) ? ("**" + stamp + "**" + _this.settings.extraString) : stamp + _this.settings.extraString;
			if (_this.settings.newLine) {
				editor.replaceSelection(stampString + '\n');
				logger('new line', 9);
			}
			else {
				editor.replaceSelection(stampString);
				logger('no new line', 9);
			}
			
			// Save entered stamp format to settings
			_this.settings.lastFormat = stampFormat;
			_this.plugin.saveData(_this.settings);
			_this.close();

			editor.scrollIntoView({
				from: editor.getCursor(),
				to: editor.getCursor(),
				})
		};

		modalEl.addClass('timestamper-modal');
	
		// Create label and text field
		const containerEl = document.createElement(divClass);
		containerEl.addClass(rowClass);

		const targetEl = document.createElement(divClass);
		targetEl.addClass('input-wrapper');

		const labelEl = document.createElement(divClass);
		labelEl.addClass('input-label');
		labelEl.setText('Format string:');

		const formatComponent = new TextComponent(targetEl);
		formatComponent.setPlaceholder('e.g. YYYY-MM-DD');
		formatComponent.setValue(this.settings.lastFormat);

		// Add listener for <Enter> key
		formatComponent.inputEl.addEventListener('keypress', (keypressed) => {
			if (keypressed.key === 'Enter')	doStamp(); 
		});
		
		// Create Button
		const buttonContainerEl = document.createElement(divClass);
		buttonContainerEl.addClass(rowClass);

		const submitButtonTarget = document.createElement(divClass);
		submitButtonTarget.addClass('button-wrapper');

		const submitButtonComponent = new ButtonComponent(submitButtonTarget);
		submitButtonComponent.setButtonText('Insert Date/Time Stamp');
		submitButtonComponent.setCta();
		submitButtonComponent.onClick(doStamp);
		// submitButtonComponent.buttonEl.addEventListener('click', (e) => doStamp)
		
		// Add components to layout
		containerEl.appendChild(labelEl);
		containerEl.appendChild(targetEl);
		buttonContainerEl.appendChild(submitButtonTarget);

		contentEl.append(containerEl);
		contentEl.append(buttonContainerEl);

		submitButtonComponent.buttonEl.focus();
	}
	
	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class TimeStamperSettingTab extends PluginSettingTab {
	plugin: TimeStamperPlugin;

	constructor(app: App, plugin: TimeStamperPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Date Stamp Template')
			.setDesc('Template String for inserting a date stamp')
			.addText(text => text
				.setValue(this.plugin.settings.dateStampFormat)
				.onChange(async (value) => {
					logger('Settings update - Date Stamp: ' + value, 5);
					this.plugin.settings.dateStampFormat = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Time Stamp Template')
			.setDesc('Template String for inserting a time stamp')
			.addText(text => text
				.setValue(this.plugin.settings.timeStampFormat)
				.onChange(async (value) => {
					logger('Settings update - Time Stamp: ' + value, 5);
					this.plugin.settings.timeStampFormat = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
		    .setName('Insert line break')
			.setDesc('Add a line break after the time/date stamp')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.newLine)
				.onChange(async (value) => {
					logger('Settings update - Insert Line Break: ' + value, 5);
					this.plugin.settings.newLine = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Make bold')
			.setDesc('Make time/date stamp bold')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.makeBold)
				.onChange(async (value) => {
					logger('Settings update - Make Bold: ' + value, 5);
					this.plugin.settings.makeBold = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Extra String')
			.setDesc('Add extra string after time/date stamp')
			.addText(text => text
				.setValue(this.plugin.settings.extraString)
				.onChange(async (value) => {
					logger('Settings update - Extra String: ' + value, 5);
					this.plugin.settings.extraString = value;
					await this.plugin.saveSettings();
		}));
	}
}