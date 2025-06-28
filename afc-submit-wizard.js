/**
 * MediaWiki:AfC-submit-wizard.js
 *
 * JavaScript used for submitting drafts to AfC.
 * Used on [[Wikipedia:Articles for creation/Submitting]].
 * Loaded via [[mw:Snippets/Load JS and CSS by URL]].
 *
 * Author: [[User:SD0001]]
 * Licence: MIT
 */

/* jshint maxerr: 999 */
/* globals mw, $, OO */
/* <nowiki> */

(function () {

$.when(
	$.ready,
	mw.loader.using([
		'mediawiki.util', 'mediawiki.api', 'mediawiki.Title',
		'mediawiki.widgets', 'oojs-ui-core', 'oojs-ui-widgets'
	])
).then(function () {
	if (mw.config.get('wgPageName') !== 'Wikipedia:Articles_for_creation/Submitting' ||
		mw.config.get('wgAction') !== 'view') {
		return;
	}
	init();
});

var afc = {}, ui = {};
window.afc = afc;
afc.ui = ui;

var config = {
	allowedNamespaces: [2, 118, 5], // User, Draft, WT
	debounceDelay: 500,
	redirectionDelay: 1000,
	defaultAfcTopic: 'other'
};

// TODO: move to a separate JSON subpage, would be feasible once [[phab:T198758]] is resolved
var messages = {
	"document-title": "Submitting your draft ...",
	"page-title": "Submitting your draft ...",
	"fieldset-label": "Submit your draft for review at Articles for Creation (AfC)",
	"title-label": "Draft title",
	"title-placeholder": "Enter the draft title, usually begins with \"Draft:\"",
	"title-helptip": "This should be pre-filled if you clicked the link while on the draft page",
	"rawclass-label": "Choose the most appropriate category",
	"rawclass-helptip": "For biographies about scholars, choose one of the two biography categories rather than one associated to their field",
	"shortdesc-placeholder": "Briefly describe the subject in 2–5 words (eg. \"British astronomer\", \"Cricket stadium in India\")",
	"shortdesc-label": "Short description",
	"shortdesc-helptip": "Try not to exceed 40 characters",
	"talktags-placeholder": "Start typing to search for tags ...",
	"talktags-label": "WikiProject classification tags",
	"talktags-helptip": "Adding the 1–4 most applicable WikiProjects is plenty. For example, if you add the Physics tag, you do not need to also add the Science tag.",
	"orestopic-placeholder": "Start typing to search for topics ...",
	"orestopic-label": "Topic classifiers",
	"orestopic-helptip": "Pick the topic areas that are relevant",
	"bestsources-placeholder1": "Enter your first source here",
	"bestsources-placeholder2": "Enter your second source here",
	"bestsources-placeholder3": "Enter your third source here",
	"source-fieldset-label": "Best sources",
	"bestsources-desc": "Articles generally require <b>[[Wikipedia:SIGCOV|significant coverage]]</b>, in <b>[[Wikipedia:RS|reliable sources]]</b>, that are <b>[[WP:INDY|independent]]</b> of the topic. You can increase the chance that your draft is reviewed quickly by providing the three strongest sources below:",
	"submit-label": "Submit",
	"footer-text": "<small>If you are not sure about what to enter in a field, you can skip it. If you need further help, you can ask at the <b>[[WP:AFCHD|AfC help desk]]</b> or get <b>[[WP:IRCHELP|live help]]</b>.<br>Facing some issues in using this form? <b>[/w/index.php?title=Wikipedia_talk:WikiProject_Articles_for_creation/Submission_wizard&action=edit&section=new&preloadtitle=Issue%20with%20submission%20form&editintro=Wikipedia_talk:WikiProject_Articles_for_creation/Submission_wizard/editintro Report it]</b>.</small>",
	"submitting-as": "Submitting as User:$1",
	"validation-invalidtitle": "Please check draft title. This title is invalid.",
	"validation-missingtitle": "Please check draft title. No such draft exists.",
	"validation-wrongns": "Please check draft title – it should begin with \"Draft:\" or \"User:\"",
	"warning-norefs": "This draft doesn't appear to contain any references. Please add references, without which it is likely to be declined. See [[Help:Introduction to referencing with Wiki Markup/2|help on adding references]].",
	"status-processing": "Processing ...",
	"status-saving": "Saving draft page ...",
	"editsummary-main": "Submitting using [[WP:AFCSW|AfC-submit-wizard]]",
	"status-redirecting": "Submission succeeded. Redirecting you to the draft page ...",
	"captcha-label": "Please enter the letters appearing in the box below",
	"captcha-placeholder": "Enter the letters here",
	"captcha-helptip": "CAPTCHA security check. Click \"Submit\" again when done.",
	"error-saving-main": "An error occurred ($1). Please try again or refer to the help desk.",
	"status-saving-talk": "Saving draft talk page ...",
	"editsummary-talk": "Adding WikiProject tags using [[WP:AFCSW|AfC-submit-wizard]]",
	"status-talk-success": "Successfully added WikiProject tags to talk page",
	"error-saving-talk": "An error occurred in editing the talk page ($1).",
	"error-main": "An error occurred ($1). Please try again or refer to the help desk."
};

function init() {
	for (var key in messages) {
		mw.messages.set('afcsw-' + key, messages[key]);
	}

	document.title = msg('document-title');
	$('#firstHeading').text(msg('page-title'));

	var apiOptions = {
		parameters: {
			format: 'json',
			formatversion: '2'
		},
		ajax: {
			headers: {
				'Api-User-Agent': 'w:en:MediaWiki:AFC-submit-wizard.js'
			}
		}
	};

	// Two different API objects so that aborts on the lookupApi don't stop the final
	// evaluate process
	afc.api = new mw.Api(apiOptions);
	afc.lookupApi = new mw.Api(apiOptions);

	constructUI();
}

function constructUI() {

	ui.fieldset = new OO.ui.FieldsetLayout({
		label: msg('fieldset-label'),
		classes: [ 'container' ],
		items: [
			ui.titleLayout = new OO.ui.FieldLayout(ui.titleInput = new mw.widgets.TitleInputWidget({
				value: (mw.util.getParamValue('page') || '').replace(/_/g, ' '),
				placeholder: msg('title-placeholder'),
			}), {
				label: msg('title-label'),
				align: 'top',
				help: msg('title-helptip'),
				helpInline: true
			}),

			ui.afcTopicLayout = new OO.ui.FieldLayout(ui.afcTopicInput = new OO.ui.RadioSelectInputWidget(), {
				label: msg('rawclass-label'),
				help: msg('rawclass-helptip'),
				align: 'inline',
			}),

			ui.shortdescLayout = new OO.ui.FieldLayout(ui.shortdescInput = new OO.ui.TextInputWidget({
				placeholder: msg('shortdesc-placeholder'),
				maxLength: 100
			}), {
				label: msg('shortdesc-label'),
				align: 'top',
				help: msg('shortdesc-helptip'),
				helpInline: true,
			}),

			ui.talkTagsLayout = new OO.ui.FieldLayout(ui.talkTagsInput = new OO.ui.MenuTagMultiselectWidget({
				placeholder: msg('talktags-placeholder'),
				tagLimit: 10,
				autocomplete: false,
				$overlay: $('<div>').addClass('projectTagOverlay').css({
					'position': 'absolute',
					'z-index': '110'
				}).appendTo('body')
			}), {
				label: msg('talktags-label'),
				align: 'top',
				help: msg('talktags-helptip'),
				helpInline: true,
			}),

			// This is shown only if the ORES topic lookup fails, or is inconclusive
			ui.oresTopicLayout = new OO.ui.FieldLayout(ui.oresTopicInput = new OO.ui.MenuTagMultiselectWidget({
				placeholder: msg('orestopic-placeholder'),
				tagLimit: 10,
				autocomplete: false, // XXX: doesn't seem to work
				options: [ "biography", "women", "food-and-drink", "internet-culture", "linguistics", "literature", "books", "entertainment", "films", "media", "music", "radio", "software", "television", "video-games", "performing-arts", "philosophy-and-religion", "sports", "architecture", "comics-and-anime", "fashion", "visual-arts", "geographical", "africa", "central-africa", "eastern-africa", "northern-africa", "southern-africa", "western-africa", "central-america", "north-america", "south-america", "asia", "central-asia", "east-asia", "north-asia", "south-asia", "southeast-asia", "west-asia", "eastern-europe", "europe", "northern-europe", "southern-europe", "western-europe", "oceania", "business-and-economics", "education", "history", "military-and-warfare", "politics-and-government", "society", "transportation", "biology", "chemistry", "computing", "earth-and-environment", "engineering", "libraries-and-information", "mathematics", "medicine-and-health", "physics", "stem", "space", "technology" ].map(function (e) {
					return {
						data: e,
						label: e
					};
				})
			}), {
				label: msg('orestopic-label'),
				align: 'top',
				help: msg('orestopic-helptip'),
				helpInline: true
			})
		]
	});
	
	ui.sourceFieldset = new OO.ui.FieldsetLayout({
		label: msg('source-fieldset-label'),
		classes: [ 'container' ],
		items: [
			ui.sourceLayoutDesc = new OO.ui.FieldLayout(new OO.ui.LabelWidget({
				label: $('<div>')
					.css("width", "100%")
					.css("max-width", "50em")
					.css("text-align", "justify")
					.append(linkify(msg('bestsources-desc')))
			}), {
				align: 'top'
			}),
			
			ui.sourceLayout1 = new OO.ui.FieldLayout(ui.bestsourcesInput1 = new OO.ui.TextInputWidget({
				placeholder: msg('bestsources-placeholder1'),
				maxLength: 200
			})),
			
			ui.sourceLayout2 = new OO.ui.FieldLayout(ui.bestsourcesInput2 = new OO.ui.TextInputWidget({
				placeholder: msg('bestsources-placeholder2'),
				maxLength: 200
			})),
			
			ui.sourceLayout3 = new OO.ui.FieldLayout(ui.bestsourcesInput3 = new OO.ui.TextInputWidget({
				placeholder: msg('bestsources-placeholder3'),
				maxLength: 200
			})),

			ui.submitLayout = new OO.ui.FieldLayout(ui.submitButton = new OO.ui.ButtonWidget({
				label: msg('submit-label'),
				flags: [ 'progressive', 'primary' ],
			}))
		]
	});

	ui.footerLayout = new OO.ui.FieldLayout(new OO.ui.LabelWidget({
		label: $('<div>')
			.append(linkify(msg('footer-text')))
	}), {
		align: 'top'
	});

	afc.topicOptionsLoaded = getJSONPage('Wikipedia:WikiProject Articles for creation/AfC topic map.json').then(function (optionsJson) {
		var options = [];
		$.each(optionsJson, function (code, info) {
			options.push({
				label: info.label,
				data: code
			});
		});
		ui.afcTopicInput.setOptions(options);
		ui.afcTopicInput.setValue(config.defaultAfcTopic);

		// resolve promise with allowed option codes:
		return options.map(function (op) {
			return op.data;
		});
	});

	ui.oresTopicLayout.toggle(false);

	var asUser = mw.util.getParamValue('username');
	if (asUser && asUser !== mw.config.get('wgUserName')) {
		ui.sourceFieldset.addItems([
			new OO.ui.FieldLayout(new OO.ui.MessageWidget({
				type: 'notice',
				inline: true,
				label: msg('submitting-as', asUser)
			}))
		], /* position */ 5); // just before submit button
	}

	// Attach
	$('#afc-submit-wizard-container').empty().append(ui.fieldset.$element, ui.sourceFieldset.$element, ui.footerLayout.$element);

	// Populate talk page tags for multi-select widget
	afc.talkTagOptionsLoaded = getJSONPage('Wikipedia:WikiProject Articles for creation/WikiProject templates.json').then(function (data) {
		ui.talkTagsInput.addOptions(Object.keys(data).map(function (k) {
			return {
				data: data[k],
				label: k
			};
		}));
	});

	ui.clearTalkTags = function () {
		afc.talkTagOptionsLoaded.then(function () {
			ui.talkTagsInput.setValue([]);
		});
	};
	ui.addTalkTags = function (tags) {
		afc.talkTagOptionsLoaded.then(function () {
			ui.talkTagsInput.setValue(ui.talkTagsInput.getValue().concat(tags));
		});
	};

	// Get mapping of infoboxes with relevant WikiProjects
	afc.ibxmapLoaded = getJSONPage('Wikipedia:WikiProject Articles for creation/Infobox WikiProject map.json');

	ui.submitButton.on('click', handleSubmit);
	ui.titleInput.on('change', mw.util.debounce(config.debounceDelay, onDraftInputChange));

	if (mw.util.getParamValue('page')) {
		onDraftInputChange();
	}

	// The default font size in monobook and modern are too small at 10px
	mw.util.addCSS('.skin-modern .projectTagOverlay, .skin-monobook .projectTagOverlay { font-size: 130%; }');

	afc.beforeUnload = function (e) {
		e.preventDefault();
		e.returnValue = '';
		return '';
	};
	$(window).on('beforeunload', afc.beforeUnload);
}

function onDraftInputChange() {
	afc.lookupApi.abort(); // abort older API requests

	var drafttitle = ui.titleInput.getValue().trim();
	if (!drafttitle) { // empty
		return;
	}
	debug('draft input changed: "' + ui.titleInput.getValue() + '"');

	// re-initialize
	ui.titleLayout.setErrors([]);
	ui.titleLayout.setWarnings([]);
	afc.oresTopics = null;
	afc.talktext = null;
	afc.pagetext = null;
	ui.clearTalkTags();

	afc.lookupApi.get({
		"action": "query",
		"prop": "revisions|description|info",
		"titles": drafttitle,
		"rvprop": "content",
		"rvslots": "main"
	}).then(setPrefillsFromPageData);

	var titleObj = mw.Title.newFromText(drafttitle);
	if (!titleObj || titleObj.isTalkPage()) {
		return;
	}
	var talkpagename = titleObj.getTalkPage().toText();
	afc.lookupApi.get({
		"action": "query",
		"prop": "revisions",
		"titles": talkpagename,
		"rvprop": "content",
		"rvslots": "main",
	}).then(setPrefillsFromTalkPageData);

}

function setPrefillsFromPageData(json) {
	debug('page fetch query', json);
	var page = json.query.pages[0];
	var preNormalizedTitle = json.query.normalized && json.query.normalized[0] &&
		json.query.normalized[0].from;
	debug('page.title: "' + page.title + '"');
	if (ui.titleInput.getValue() !== (preNormalizedTitle || page.title)) {
		return; // user must have changed the title already
	}
	var errors = errorsFromPageData(page);
	if (errors.length) {
		ui.titleLayout.setErrors(errors);
		return;
	}
	ui.titleLayout.setWarnings(warningsFromPageData(page));

	afc.pagetext = page.revisions[0].slots.main.content;

	// Set AfC topic category
	var topicMatch = afc.pagetext.match(/\{\{AfC topic\|(.*?)\}\}/);
	if (topicMatch) {
		afc.topicOptionsLoaded.then(function(allowedCodes) {
			var topic = topicMatch[1];
			debug("Allowed topic codes fetched:", allowedCodes);
			debug("AfC topic found:", topic);
			// if the code found in the template is an invalid one, keep the default to "other",
			// rather than the first item in the list
			if (allowedCodes.indexOf(topic) !== -1) {
				ui.afcTopicInput.setValue(topic);
			} else {
				ui.afcTopicInput.setValue(config.defaultAfcTopic);
			}
		});
	} else {
		ui.afcTopicInput.setValue(config.defaultAfcTopic);
	}

	// Set short description in form
	ui.shortdescInput.setValue(page.description || '');

	// Guess WikiProject tags from infoboxes on the page
	afc.ibxmapLoaded.then(function (ibxmap) {
		var infoboxRgx = /\{\{([Ii]nfobox [^|}]*)/g,
			wikiprojects = [],
			match;
		while (match = infoboxRgx.exec(afc.pagetext)) {
			var ibx = match[1].trim();
			ibx = ibx[0].toUpperCase() + ibx.slice(1);
			if (ibxmap[ibx]) {
				wikiprojects = wikiprojects.concat(ibxmap[ibx]);
			}
		}
		debug('wikiprojects from infobox: ', wikiprojects);
		ui.addTalkTags(wikiprojects);
	});

	// Fill ORES topics
	getOresTopics(page.lastrevid).then(function (topics) {
		debug('ORES topics: ', topics);
		if (!topics || !topics.length) { // unexpected API response or API returns unsorted
			ui.oresTopicLayout.toggle(true);
		} else {
			ui.oresTopicLayout.toggle(false);
			afc.oresTopics = topics;
		}
	}, function () {
		ui.oresTopicLayout.toggle(true);
	});
}

function setPrefillsFromTalkPageData (json) {
	var talkpage = json.query.pages[0];
	if (!talkpage || talkpage.missing) {
		return;
	}
	afc.talktext = talkpage.revisions[0].slots.main.content;
	debug(afc.talktext);

	var existingWikiProjects = extractWikiProjectTagsFromText(afc.talktext);
	var existingTags = existingWikiProjects.map(function (e) {
		return e.name;
	});
	debug(existingTags);
	ui.addTalkTags(existingTags);
}

/**
 * @param {Object} page - from query API response
 * @returns {string[]}
 */
function errorsFromPageData(page) {
	if (!page || page.invalid) {
		return [msg('validation-invalidtitle')];
	}
	if (page.missing) {
		return [msg('validation-missingtitle')];
	}
	if (config.allowedNamespaces.indexOf(page.ns) === -1) {
		return [msg('validation-wrongns')];
	}
	return [];
}

/**
 * @param {Object} page - from query API response
 * @returns {string[]}
 */
function warningsFromPageData(page) {
	var pagetext = page.revisions[0].slots.main.content;

	var warnings = [];

	// Show no refs warning
	if (!/<ref/i.test(pagetext) && !/\{\{([Ss]fn|[Hh]arv)/.test(pagetext)) {
		warnings.push('warning-norefs');
	}

	// TODO: Show warning for use of deprecated/unreliable sources
	// TODO: Show tip for avoiding peacock words or promotional language?

	return warnings.map(function (warning) {
		return new OO.ui.HtmlSnippet(linkify(msg(warning)));
	});
}

/**
 * @param {number} revid
 * @returns {jQuery.Promise<string[]>}
 */
function getOresTopics(revid) {
	return $.get('https://ores.wikimedia.org/v3/scores/enwiki/?models=drafttopic&revids=' + revid).then(function (json) {

		// null is returned if at any point something in the API output is unexpected
		// ES2020 has optional chaining, but of course on MediaWiki we're still stuck with ES5
		return json &&
			json.enwiki &&
			json.enwiki.scores &&
			json.enwiki.scores[revid] &&
			json.enwiki.scores[revid].drafttopic &&
			json.enwiki.scores[revid].drafttopic.score &&
			(json.enwiki.scores[revid].drafttopic.score.prediction instanceof Array) &&
			json.enwiki.scores[revid].drafttopic.score.prediction.map(function (topic, idx, topics) {
				// Remove Asia.Asia* if Asia.South-Asia is present (example)
				if (topic.slice(-1) === '*') {
					var metatopic = topic.split('.').slice(0, -1).join('.');
					for (var i = 0; i < topics.length; i++) {
						if (topics[i] !== topic && topics[i].startsWith(metatopic)) {
							return;
						}
					}
					return metatopic.split('.').pop();
				}
				return topic.split('.').pop();
			})
			.filter(function (e) {
				return e; // filter out undefined from above
			})
			.map(function (topic) {
				// convert topic string to normalised form
				return topic
					.replace(/[A-Z]/g, function (match) {
						return match[0].toLowerCase();
					})
					.replace(/ /g, '-')
					.replace(/&/g, 'and');
			});
	});
}

/***
 * @param {string} text
 * @returns {{wikitext: string, name: string}[]}
 */
function extractWikiProjectTagsFromText(text) {
	if (!text) {
		return [];
	}

	// this is best-effort, no guaranteed accuracy
	var existingTags = [];
	var rgx = /\{\{(WikiProject [^|}]*).*?\}\}/g;
	var match;
	while (match = rgx.exec(text)) { // jshint ignore:line
		var tag = match[1].trim();
		if (tag === 'WikiProject banner shell') {
			continue;
		}
		existingTags.push({
			wikitext: match[0],
			name: tag
		});
	}
	return existingTags;
}

/**
 * @param {string} type
 * @param {string} message
 */
function setMainStatus(type, message) {
	if (!ui.mainStatusLayout || !ui.mainStatusLayout.isElementAttached()) {
		ui.sourceFieldset.addItems([
			ui.mainStatusLayout = new OO.ui.FieldLayout(ui.mainStatusArea = new OO.ui.MessageWidget())
		]);
	}
	ui.mainStatusArea.setType(type);
	ui.mainStatusArea.setLabel(message);
}


/**
 * @param {string} type
 * @param {string} message
 */
function setTalkStatus(type, message) {
	if (!ui.talkStatusLayout) {
		ui.sourceFieldset.addItems([
			ui.talkStatusLayout = new OO.ui.FieldLayout(ui.talkStatusArea = new OO.ui.MessageWidget())
		]);
	}
	ui.talkStatusArea.setType(type);
	ui.talkStatusArea.setLabel(message);
}

function handleSubmit() {

	setMainStatus('notice', msg('status-processing'));
	ui.submitButton.setDisabled(true);
	ui.mainStatusLayout.scrollElementIntoView();

	var draft = ui.titleInput.getValue();
	debug(draft);

	afc.api.get({
		"action": "query",
		"prop": "revisions|description",
		"titles": draft,
		"rvprop": "content",
		"rvslots": "main",
	}).then(function (json) {
		var apiPage = json.query.pages[0];

		var errors = errorsFromPageData(apiPage);
		if (errors.length) {
			ui.titleLayout.setErrors(errors);
			ui.sourceFieldset.removeItems([ui.mainStatusLayout]);
			ui.submitButton.setDisabled(false);
			ui.titleLayout.scrollElementIntoView();
			return;
		}

		var text = prepareDraftText(apiPage);

		setMainStatus('notice', msg('status-saving'));
		saveDraftPage(draft, text).then(function () {
			setMainStatus('success', msg('status-redirecting'));

			$(window).off('beforeunload', afc.beforeUnload);
			setTimeout(function () {
				location.href = mw.util.getUrl(draft);
			}, config.redirectionDelay);
		}, function (code, err) {
			if (code === 'captcha') {
				ui.sourceFieldset.removeItems([ui.mainStatusLayout, ui.talkStatusLayout]);
				ui.captchaLayout.scrollElementIntoView();
			} else {
				setMainStatus('error', msg('error-saving-main', makeErrorMessage(code, err)));
			}
			ui.submitButton.setDisabled(false);
		});

		var talktext = prepareTalkText(afc.talktext);
		if (!afc.talktext && !talktext) {
			// No content earlier, no content now. Stop here to avoid
			// creating the talk page as empty.
			return;
		}

		setTalkStatus('notice', msg('status-saving-talk'));
		afc.api.postWithEditToken({
			"action": "edit",
			"title": new mw.Title(draft).getTalkPage().toText(),
			"text": talktext,
			"summary": msg('editsummary-talk')
		}).then(function (data) {
			if (data.edit && data.edit.result === 'Success') {
				setTalkStatus('success', msg('status-talk-success'));
			} else {
				return $.Deferred().reject('unexpected result');
			}
		}).catch(function (code, err) {
			setTalkStatus('error', msg('error-saving-talk', makeErrorMessage(code, err)));
		});


	}).catch(function (code, err) {
		setMainStatus('error', msg('error-main', makeErrorMessage(code, err)));
		ui.submitButton.setDisabled(false);
	});

}

function saveDraftPage(title, text) {

	// TODO: handle edit conflict
	var editParams = {
		"action": "edit",
		"title": title,
		"text": text,
		"summary": msg('editsummary-main')
	};
	if (ui.captchaLayout && ui.captchaLayout.isElementAttached()) {
		editParams.captchaid = afc.captchaid;
		editParams.captchaword = ui.captchaInput.getValue();
		ui.sourceFieldset.removeItems([ui.captchaLayout]);
	}
	return afc.api.postWithEditToken(editParams).then(function (data) {
		if (!data.edit || data.edit.result !== 'Success') {
			if (data.edit && data.edit.captcha) {
				// Handle captcha for non-confirmed users

				var url = data.edit.captcha.url;
				afc.captchaid = data.edit.captcha.id; // abuse of global?
				ui.sourceFieldset.addItems([
					ui.captchaLayout = new OO.ui.FieldLayout(ui.captchaInput = new OO.ui.TextInputWidget({
						placeholder: msg('captcha-placeholder'),
						required: true
					}), {
						warnings: [ new OO.ui.HtmlSnippet('<img src=' + url + '>') ],
						label: msg('captcha-label'),
						align: 'top',
						help: msg('captcha-helptip'),
						helpInline: true,
					}),
				], /* position */ 6); // just after submit button
				// TODO: submit when enter key is pressed in captcha field

				return $.Deferred().reject('captcha');

			} else {
				return $.Deferred().reject('unexpected-result');
			}
		}
	});
}

/**
 * @param {Object} page - page information from the API
 * @returns {string} final draft page text to save
 */
function prepareDraftText(page) {
	var text = page.revisions[0].slots.main.content;

	var header = '';

	// Handle short description
	var shortDescTemplateExists = /\{\{[Ss]hort ?desc(ription)?\s*\|/.test(text);
	var shortDescExists = !!page.description;
	var existingShortDesc = page.description;

	if (ui.shortdescInput.getValue()) {
		// 1. No shortdesc - insert the one provided by user
		if (!shortDescExists) {
			header += '{{Short description|' + ui.shortdescInput.getValue() + '}}\n';

		// 2. Shortdesc exists from {{short description}} template - replace it
		} else if (shortDescExists && shortDescTemplateExists) {
			text = text.replace(/\{\{[Ss]hort ?desc(ription)?\s*\|.*?\}\}\n*/g, '');
			header += '{{Short description|' + ui.shortdescInput.getValue() + '}}\n';

		// 3. Shortdesc exists, but not generated by {{short description}}. If the user
		//  has changed the value, save the new value
		} else if (shortDescExists && existingShortDesc !== ui.shortdescInput.getValue()) {
			header += '{{Short description|' + ui.shortdescInput.getValue() + '}}\n';

		// 4. Shortdesc exists, but not generated by {{short description}}, and user hasn't changed the value
		} else {
			// Do nothing
		}
	} else {
		// User emptied the shortdesc field (or didn't exist from before): remove any existing shortdesc.
		// This doesn't remove any shortdesc that is generated by other templates
		// Race condition (FIXME): if someone else added a shortdesc to the draft after this user opened the wizard,
		// that shortdesc gets removed
		text = text.replace(/\{\{[Ss]hort ?desc(ription)?\s*\|.*?\}\}\n*/g, '');
	}


	// Draft topics
	debug(ui.oresTopicInput);
	if (ui.oresTopicLayout.isVisible()) {
		afc.oresTopics = ui.oresTopicInput.getValue();
	}
	if (afc.oresTopics && afc.oresTopics.length) {
		text = text.replace(/\{\{[Dd]raft topics\|.*?\}\}\n*/g, '');
		header += '{{Draft topics|' + afc.oresTopics.join('|') + '}}\n';
	}

	// Add AfC topic
	text = text.replace(/\{\{AfC topic\|(.*?)\}\}/g, '');
	header += '{{AfC topic|' + ui.afcTopicInput.getValue() + '}}\n';

	// put AfC submission template
	header += '{{subst:submit|1=' + (mw.util.getParamValue('username') || '{{subst:REVISIONUSER}}') + '}}\n';

	// Check for best sources
	if (ui.bestsourcesInput1.getValue() || ui.bestsourcesInput2.getValue() || ui.bestsourcesInput3.getValue()) {
		text = text.replace(/\{\{Best sources\|(.*?)\}\}/g, '');
		bestSources = '{{Best sources';
		if (ui.bestsourcesInput1.getValue()) {
			bestSources += ' | src1 = ' + ui.bestsourcesInput1.getValue();
		}
		if (ui.bestsourcesInput2.getValue()) {
			bestSources += ' | src2 = ' + ui.bestsourcesInput2.getValue();
		}
		if (ui.bestsourcesInput3.getValue()) {
			bestSources += ' | src3 = ' + ui.bestsourcesInput3.getValue();
		}
		bestSources += '}}';
		header += bestSources;
	}
	// insert everything to the top
	text = header + text;
	debug(text);

	return text;
}


/**
 * @param {string} initialText - initial talk page text
 * @returns {string} - final talk page text to save
 */
function prepareTalkText(initialText) {
	var text = initialText;

	// TODO: this can be improved to put tags within {{WikiProject banner shell}} (if already present or otherwise)
	var alreadyExistingWikiProjects = extractWikiProjectTagsFromText(text);
	var alreadyExistingTags = alreadyExistingWikiProjects.map(function (e) {
		return e.name;
	});
	var tagsToAdd = ui.talkTagsInput.getValue().filter(function (tag) {
		return alreadyExistingTags.indexOf(tag) === -1;
	});
	var tagsToRemove = alreadyExistingTags.filter(function (tag) {
		return ui.talkTagsInput.getValue().indexOf(tag) === -1;
	});

	tagsToRemove.forEach(function (tag) {
		text = text.replace(new RegExp('\\{\\{\\s*' + tag + '\\s*(\\|.*?)?\\}\\}\\n?'), '');
	});

	var tagsToAddText = tagsToAdd.map(function (tag) {
		return '{{' + tag + '}}';
	}).join('\n') + (tagsToAdd.length ? '\n' : '');

	text = tagsToAddText + (text || '');

	// remove |class=draft parameter in any WikiProject templates
	text = text.replace(/(\{\{wikiproject.*?)\|\s*class\s*=\s*draft\s*/gi, '$1');

	return text;
}

/**
 * Load a JSON page from the wiki.
 * Use API (instead of $.getJSON with action=raw) to take advantage of caching
 * @param {string} page
 * @returns {jQuery.Promise<Record<string, any>>}
 **/
function getJSONPage (page) {
	return afc.api.get({
		action: 'query',
		titles: page,
		prop: 'revisions',
		rvprop: 'content',
		rvlimit: 1,
		rvslots: 'main',
		uselang: 'content',
		maxage: '3600', // 1 hour
		smaxage: '3600',
		formatversion: 2
	}).then(function (json) {
		var content = json.query.pages[0].revisions[0].slots.main.content;
		return JSON.parse(content);
	}).catch(function (code, err) {
		console.error(makeErrorMessage(code, err));
	});
}

/**
 * Expands wikilinks and external links into HTML.
 * Used instead of mw.msg(...).parse() because we want links to open in a new tab,
 * and we don't want tags to be mangled.
 * @param {string} input
 * @returns {string}
 */
function linkify(input) {
	return input
		.replace(
			/\[\[:?(?:([^|\]]+?)\|)?([^\]|]+?)\]\]/g,
			function(_, target, text) {
				if (!target) {
					target = text;
				}
				return '<a target="_blank" href="' + mw.util.getUrl(target) +
					'" title="' + target.replace(/"/g, '&#34;') + '">' + text + '</a>';
			}
		)
		// for ext links, display text should be given
		.replace(
			/\[(\S*?) (.*?)\]/g,
			function (_, target, text) {
				return '<a target="_blank" href="' + target + '">' + text + '</a>';
			}
		);
}

function msg(key) {
	var messageArgs = Array.prototype.slice.call(arguments, 1);
	return mw.msg.apply(mw, ['afcsw-' + key].concat(messageArgs));
}

function makeErrorMessage(code, err) {
	if (code === 'http') {
		return 'http: there is no internet connectivity';
	}
	return code + (err && err.error && err.error.info ? ': ' + err.error.info : '');
}

function debug() {
	Array.prototype.slice.call(arguments).forEach(function (arg) {
		console.log(arg);
	});
}

})(); // File-level closure to protect functions from being exposed to the global scope or overwritten

/* </nowiki> */
