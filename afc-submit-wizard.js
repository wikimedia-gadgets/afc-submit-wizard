/**
 * MediaWiki:AfC-submit-wizard.js
 *
 * JavaScript used for submitting drafts to AfC.
 * Used on [[Wikipedia:Articles for creation/Submitting]].
 * Loaded via [[mw:Snippets/Load JS and CSS by URL]].
 *
 * Edits can be proposed via GitHub (https://github.com/wikimedia-gadgets/afc-submit-wizvalidation-notitleard)
 * or a talk page request.
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
	"title-placeholder": "Enter the draft page name, usually begins with \"Draft:\"",
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
	"bestsources-desc": "Articles generally require <b>[[Wikipedia:SIGCOV|significant coverage]]</b>, in <b>[[Wikipedia:RS|reliable sources]]</b> (such as newspapers and books), that are <b>[[WP:INDY|independent]]</b> of the topic. You can increase the chance that your draft is reviewed quickly by providing the three strongest sources below:",
	"sng-desc": "On Wikipedia, <b>[[Wikipedia:Notability|notability]]</b> is a test used by editors to decide whether a given topic warrants its own article. Select one or more <b>[[Category:Wikipedia notability guidelines|notability guidelines]]</b> that you believe the topic meets.",
	"sng-placeholder": "Select notability guidelines",
	"submit-label": "Submit",
	"footer-text": "<small>If you are not sure about what to enter in a field, you can skip it. If you need help, you can ask at the <b>[[WP:AFCHD|AfC help desk]]</b> or get live help via <b>[[WP:IRCHELP|IRC]]</b> or <b>[[WP:DISCORD|Discord]]</b>.<br>Facing some issues in using this form? <b>[/w/index.php?title=Wikipedia_talk:WikiProject_Articles_for_creation/Submission_wizard&action=edit&section=new&preloadtitle=Issue%20with%20submission%20form&editintro=Wikipedia_talk:WikiProject_Articles_for_creation/Submission_wizard/editintro Report it]</b>.</small>",
	"submitting-as": "Submitting as User:$1",
	"validation-notitle": "Please enter the draft page name",
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

var sngList = [ ["General", "GNG", "", "Significant coverage in several independent, reliable sources"],
["Academics", "NPROF", "1", "Significant impact in their scholarly discipline"],
["Academics", "NPROF", "2", "Highly prestigious academic award or honor at a national or international level"],
["Academics", "NPROF", "3a", "Elected member of a highly selective and prestigious scholarly society or association"],
["Academics", "NPROF", "3b", "Fellow of a major scholarly society which reserves fellow status as a highly selective honor"],
["Academics", "NPROF", "4", "Significant impact in the area of higher education"],
["Academics", "NPROF", "5a", "Distinguished professor appointment at a major institution of higher education and research"],
["Academics", "NPROF", "5b", "Named chair appointment that indicates a comparable level of achievement"],
["Academics", "NPROF", "5c", "Equivalent position in countries where named chairs are uncommon"],
["Academics", "NPROF", "6", "Highest-level elected or appointed administrative post at a major academic institution or society"],
["Academics", "NPROF", "7", "Substantial impact outside academia in their academic capacity"],
["Academics", "NPROF", "8", "Head or chief editor of a major, well-established academic journal in their subject area"],
["Astronomical objects", "NASTRO", "1", "Visible to the naked eye (<6.0 magnitude) at some point"],
["Astronomical objects", "NASTRO", "2", "Listed in a catalogue of high historical importance or high interest to amateur astronomers"],
["Astronomical objects", "NASTRO", "3", "Significant commentary in multiple non-trivial published works"],
["Astronomical objects", "NASTRO", "4", "Discovered before 1850"],
["Books", "NBOOK", "1", "Subject of two or more non-trivial published works appearing in sources that are independent of the book itself"],
["Books", "NBOOK", "2", "Won a major literary award"],
["Books", "NBOOK", "3", "Considered to have made a significant contribution to sciences, humanities or arts, or to an event, political or religious movement"],
["Books", "NBOOK", "4", "Subject of instruction at two or more schools, colleges, universities or post-graduate programs in any particular country"],
["Books", "NBOOK", "5", "Author of exceptional significance and a common subject of academic study"],
["Films", "NFOE", "1", "Widely distributed and has received full-length reviews by two or more nationally known critics"],
["Films", "NFOE", "2a", "Two non-trivial articles at least five years after the film's initial release"],
["Films", "NFOE", "2b", "Deemed notable by a broad survey of film critics, academics, or movie professionals, at least five years after the film's release"],
["Films", "NFOE", "2c", "Commercial re-release, or festival screening, at least five years after initial release"],
["Films", "NFOE", "2d", "Featured as part of a documentary, program, or retrospective on the history of cinema"],
["Films", "NFOE", "3", "Received a major award for excellence in some aspect of filmmaking"],
["Films", "NFOE", "4", "Selected for preservation in a national archive"],
["Films", "NFOE", "5", "Taught as a subject at an accredited university or college with a notable film program"],
["Films", "NFIC", "1", "Represents a unique accomplishment in cinema, or is a milestone in the development of film art or of a national cinema"], // Not a mistake, NFILM has two sets of numbers
["Films", "NFIC", "2", "Significant involvement by a notable person and is a major part of their career"],
["Films", "NFIC", "3", "Produced and successfully distributed domestically by a \"major film studio\" in a country that is not a major film producing country"],
["Geographic features (natural)", "NATFEAT", "", "Named natural feature with verifiable content"],
["Geographic features (artificial)", "GEOFEAT", "", "Officially assigned a protected status on a national level, with verifiable conntent"],
["Places", "NPLACE", "", "Populated, legally recognized places"],
["Roads", "NROAD", "", "International road networks, or Interstate, national, state or provincial highway"],
["Musicians and ensembles", "MUSICBIO", "2", "Had a single or album on any country's national music chart."],
["Musicians and ensembles", "MUSICBIO", "3", "Had a record certified gold or higher in at least one country"],
["Musicians and ensembles", "MUSICBIO", "4", "Non-trivial coverage in independent reliable sources of an international or national concert tour"],
["Musicians and ensembles", "MUSICBIO", "5", "Released two or more albums on a major record label or on one of the more important indie labels"],
["Musicians and ensembles", "MUSICBIO", "6a", "Ensemble that contains two or more musicians with Wikipedia articles"],
["Musicians and ensembles", "MUSICBIO", "6b", "Musician who has been a reasonably prominent member of two or more ensembles with Wikipedia articles"],
["Musicians and ensembles", "MUSICBIO", "7", "One of the most prominent representatives of a notable style or the most prominent of the local scene of a city"],
["Musicians and ensembles", "MUSICBIO", "8", "Won or nominated for a major music award, such as a Grammy, Juno, Mercury, Choice or Grammis award"],
["Musicians and ensembles", "MUSICBIO", "9", "Won first, second, or third place in a major music competition"],
["Musicians and ensembles", "MUSICBIO", "10", "Performed music for a work of media with a Wikipedia article, and not suitable for a redirect"],
["Musicians and ensembles", "MUSICBIO", "11", "Placed in rotation nationally by a major radio or music television network"],
["Musicians and ensembles", "MUSICBIO", "12", "Featured subject of a substantial broadcast segment across a national radio or television network"],
["Composers and lyricists", "COMPOSER", "1", "Credit for writing or co-writing either lyrics or music for a composition with a Wikipedia article"],
["Composers and lyricists", "COMPOSER", "2", "Wrote musical theatre of some sort that was performed in a theatre with a Wikipedia article that had a reasonable run"],
["Composers and lyricists", "COMPOSER", "3", "Work used as the basis for a later composition by a songwriter, composer, or lyricist who meets the above criteria"],
["Composers and lyricists", "COMPOSER", "4", "Wrote a composition that has won a major music competition not established expressly for newcomers"],
["Composers and lyricists", "COMPOSER", "5", "Listed as a major influence or teacher of a composer, songwriter, or lyricist who meets the above criteria"],
["Composers and lyricists", "COMPOSER", "6", "Appears at reasonable length in standard reference books on their genre of music"],
["Musicians (others)", "NMUSICOTHER", "1", "Frequently covered in publications devoted to a music sub-culture with a Wikipedia article"],
["Musicians (others)", "NMUSICOTHER", "2", "Composed a number of melodies or tunes with their own Wikipedia articles, or standards used in a notable music genre"],
["Musicians (others)", "NMUSICOTHER", "3", "Cited by reliable sources as being influential in style, technique, repertory, or teaching for a particular music genre"],
["Musicians (others)", "NMUSICOTHER", "4", "Cited by reliable sources as having established a tradition or school in a particular music genre"],
["Musicians (others)", "NMUSICOTHER", "5", "Listed as a significant musical influence on musicians or composers who meet the above criteria"],
["Recordings", "NALBUM", "2", "Appeared on any country's national music chart"],
["Recordings", "NALBUM", "3", "Certified gold or higher in at least one country"],
["Recordings", "NALBUM", "4", "Won or been nominated for a major music award, such as a Grammy, Juno, Mercury, Choice or Grammis award"],
["Recordings", "NALBUM", "5", "Performed in a medium (television show, film, compilation album...) with its own article, and not suitable for a redirect"],
["Recordings", "NALBUM", "6", "In rotation nationally by a major radio or music television networ"],
["Recordings", "NALBUM", "7", "Featured subject of a substantial broadcast segment across a national radio or television network"],
["People", "NBIO", "1", "Received a well-known and significant award or honor, or has been nominated for such an award several times"],
["People", "NBIO", "2", "Made a widely recognized contribution that is part of the enduring historical record in a specific field"],
["People", "NBIO", "3", "Has an entry in a country's standard national biographical dictionary"],
["Creative professionals", "NCREATIVE", "1", "Regarded as an important figure or widely cited by peers or successors"],
["Creative professionals", "NCREATIVE", "2", "Known for originating a significant new concept, theory, or technique"],
["Creative professionals", "NCREATIVE", "3", "Created or played a major role in co-creating a significant or well-known work or collective body of work"],
["Creative professionals", "NCREATIVE", "4a", "Work has become a significant monument"],
["Creative professionals", "NCREATIVE", "4b", "Work has been a substantial part of a significant exhibition"],
["Creative professionals", "NCREATIVE", "4c", "Work has won significant critical attention"],
["Creative professionals", "NCREATIVE", "4d", "Work has been represented within the permanent collections of several notable galleries or museums"],
["Crime victims", "VICTIM", "", "Had a large role within a well-documented historic event, and not suitable for a redirect"],
["Crime perpetrators", "PERP", "1", "Victim of the crime is a renowned national or international figure, and not suitable for a redirect"],
["Crime perpetrators", "PERP", "2", "Motivation or execution of the crime is unusual such that it is a well-documented historic event, and not suitable for a redirect"],
["Entertainers", "ENT", "1", "Had significant roles in multiple productions with their own article"],
["Entertainers", "ENT", "2", "Made unique, prolific or innovative contributions to a field of entertainment"],
["Politicians and judges", "NPOL", "", "Held office at the international or national level"],
["Politicians and judges (subnational)", "NSUBPOL", "", "Held office at the subnational level in federal states"],
["Species", "NSPECIES", "", "Eukaryotic species accepted by taxonomists"] ];

function init() {
	for (var key in messages) {
		mw.messages.set('afcsw-' + key, messages[key]);
	}

	document.title = msg('document-title');
	$('#firstHeading').text(msg('page-title'));

	mw.util.addCSS(
		// CSS adjustments for vector-2022: hide prominent page controls which are
		// irrelevant and confusing while using the wizard
		'.vector-page-toolbar { display: none } ' +
		'.vector-page-titlebar #p-lang-btn { display: none } ' +

		// Hide categories as well, prevents accidental HotCat usage
		'#catlinks { display: none } '
	);

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
			}),
			
			ui.sngDesc = new OO.ui.FieldLayout(new OO.ui.LabelWidget({
				label: $('<div>')
					.css("width", "100%")
					.css("max-width", "50em")
					.css("text-align", "justify")
					.append(linkify(msg('sng-desc')))
			}), {
				align: 'top'
			}),
			
			ui.sngLayout = new OO.ui.FieldLayout(ui.sngInput = new OO.ui.DropdownInputWidget({
				tagLimit: 10,
				autocomplete: false, // XXX: doesn't seem to work
				options: sngList.map(function (e) {
					return {
						data: [e[1], e[2]],
						label: e[0] + (e[2] ? " #" + e[2] : "") + " – " + e[3]
					};
				}),
				placeholder: msg('sng-placeholder')
			})),
			
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
		ui.fieldset.addItems([
			new OO.ui.FieldLayout(new OO.ui.MessageWidget({
				type: 'notice',
				inline: true,
				label: msg('submitting-as', asUser)
			}))
		], /* position */ 5); // just before submit button
	}

	// Attach
	$('#afc-submit-wizard-container').empty().append(ui.fieldset.$element, ui.footerLayout.$element);
	
	$("#" + ui.sngLayout.getElementId()).css("margin-top", "4px");
	$("#" + ui.sourceLayout1.getElementId()).css("margin-top", "4px");
	$("#" + ui.sourceLayout2.getElementId()).css("margin-top", "4px");
	$("#" + ui.sourceLayout3.getElementId()).css("margin-top", "4px");

	mw.track('counter.gadget_afcsw.opened');

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
	ui.sngInput.on('change', mw.util.debounce(config.debounceDelay, onSngInputChange));

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

function onSngInputChange() {
	var activeSng = ui.sngInput.getValue().split(",");
	if (activeSng[0] == "GNG") {
		$("#" + ui.sourceLayoutDesc.getElementId()).css("display", "block");
		$("#" + ui.sourceLayout1.getElementId()).css("display", "block");
		$("#" + ui.sourceLayout2.getElementId()).css("display", "block");
		$("#" + ui.sourceLayout3.getElementId()).css("display", "block");
	} else {
		$("#" + ui.sourceLayoutDesc.getElementId()).css("display", "none");
		$("#" + ui.sourceLayout1.getElementId()).css("display", "none");
		$("#" + ui.sourceLayout2.getElementId()).css("display", "none");
		$("#" + ui.sourceLayout3.getElementId()).css("display", "none");
	}
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
		ui.fieldset.addItems([
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
		ui.fieldset.addItems([
			ui.talkStatusLayout = new OO.ui.FieldLayout(ui.talkStatusArea = new OO.ui.MessageWidget())
		]);
	}
	ui.talkStatusArea.setType(type);
	ui.talkStatusArea.setLabel(message);
}

function handleSubmit() {

	setMainStatus('notice', msg('status-processing'));
	mw.track('counter.gadget_afcsw.submit_attempted');
	ui.submitButton.setDisabled(true);
	ui.mainStatusLayout.scrollElementIntoView();

	var draft = ui.titleInput.getValue();
	if (!draft) {
		ui.titleLayout.setErrors([msg('validation-notitle')]);
		ui.fieldset.removeItems([ui.mainStatusLayout]);
		ui.submitButton.setDisabled(false);
		ui.titleLayout.scrollElementIntoView();
		return;
	}
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
			ui.fieldset.removeItems([ui.mainStatusLayout]);
			ui.submitButton.setDisabled(false);
			ui.titleLayout.scrollElementIntoView();
			return;
		}

		var text = prepareDraftText(apiPage);

		setMainStatus('notice', msg('status-saving'));
		saveDraftPage(draft, text).then(function () {
			setMainStatus('success', msg('status-redirecting'));
			mw.track('counter.gadget_afcsw.submit_succeeded');

			$(window).off('beforeunload', afc.beforeUnload);
			setTimeout(function () {
				location.href = mw.util.getUrl(draft);
			}, config.redirectionDelay);
		}, function (code, err) {
			if (code === 'captcha') {
				ui.fieldset.removeItems([ui.mainStatusLayout, ui.talkStatusLayout]);
				ui.captchaLayout.scrollElementIntoView();
				mw.track('counter.gadget_afcsw.submit_captcha');
			} else {
				setMainStatus('error', msg('error-saving-main', makeErrorMessage(code, err)));
				mw.track('counter.gadget_afcsw.submit_failed');
				mw.track('counter.gadget_afcsw.submit_failed_' + code);
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
		mw.track('counter.gadget_afcsw.submit_failed');
		mw.track('counter.gadget_afcsw.submit_failed_' + code);
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
		ui.fieldset.removeItems([ui.captchaLayout]);
	}
	return afc.api.postWithEditToken(editParams).then(function (data) {
		if (!data.edit || data.edit.result !== 'Success') {
			if (data.edit && data.edit.captcha) {
				// Handle captcha for non-confirmed users

				var url = data.edit.captcha.url;
				afc.captchaid = data.edit.captcha.id; // abuse of global?
				ui.fieldset.addItems([
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
	sng = ui.sngInput.getValue().split(",");
	sourcesExist = (sng[0] == "GNG") && (ui.bestsourcesInput1.getValue() || ui.bestsourcesInput2.getValue() || ui.bestsourcesInput3.getValue());
	
	if(sng[1] != "") {
		sng = '[[WP:' + sng[0] + ']]#' + sng[1];
	} else {
		sng = '[[WP:' + sng[0] + ']]';
	}
	
	header += '{{afc comment|1=';
	header += 'I believe this article meets ' + sng + '. ';
	if (sourcesExist) {
		header += '[[WP:THREE]] sources are available on the talk page. ';
	}
	header +=  '~~' + '~~}}\n';
	
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
	
	sng = ui.sngInput.getValue().split(",");
	sourcesExist = (sng[0] == "GNG") && (ui.bestsourcesInput1.getValue() || ui.bestsourcesInput2.getValue() || ui.bestsourcesInput3.getValue());
	
	if (sourcesExist) {
		text = text.replace(/\{\{Best sources\|(.*?)\}\}/g, '');
		bestSources = '\n== [[WP:THREE]] best sources ==\n{{Best sources';
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
		text += bestSources;
	}
	
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
