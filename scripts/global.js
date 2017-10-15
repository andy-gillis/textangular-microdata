// Setup angular module controller
angular.module('editor', ['textAngular']).controller('editorCtrl', function () {
});

// Handle markup submission
function SubmitMarkup() {
    var $editor = $("div[id^=taTextElement]"),
        $result = $("div[id='submitted-markup']");

    $editor.find("*:empty").each(function () {
        var $this = $(this),
            tagName = $this.prop('tagName').toLowerCase();
        if (!$.inArray(tagName, ["br", "hr"])) $this.remove();
    });

    $editor.find("#insertion").remove();
    $result.text($editor.html());
}

// Insert microdata content into editor
function InsertMicrodataContent($form) {
    var $labels,
        $dates,
        $inputs,
        $items;

    // Remove label fields
    $labels = $form.find("label");
    $labels.each(function () {
        $(this).remove();
    });

    // Parse datetime fields
    $dates = $form.find("input[type='datetime-local']");
    $dates.each(function () {
        var $this = $(this),
            val = $this.val(),
            date = new Date(val);
        $this.closest("[itemprop]").attr("content", val);
        $this.parent().text(date.toDateString() + ", " + date.toLocaleTimeString());
    });

    // Parse and remove input fields
    $inputs = $form.find("input");
    $inputs.each(function () {
        var $this = $(this),
            $par = $this.parent(),
            prop = $par.attr("itemprop"),
            val = $.trim($this.val()),
            val2, $link;

        switch (prop) {
            case "email":
                val2 = val.toLowerCase().indexOf("mailto:") === -1 ? "mailto:" + val : val;
                $link = $("<a />", { itemprop: prop, href: val2 }).text(val);
                $par.html($link).attr("itemprop", null);
                break;

            case "url":
                val2 = val.toLowerCase().indexOf("://") === -1 ? "http://" + val : val;
                $link = $("<a />", { itemprop: prop, href: val2 }).text(val);
                $par.html($link).attr("itemprop", null);
                break;

            default:
                $par.text(val);
                break;
        }
    });

    // Remove microdata elements not having alpha-numeric content
    $items = $form.find("[itemprop],[itemtype]");
    $items.each(function () {
        var $this = $(this),
            $par = $this.parent();
        if ($par && $par.text().replace(/\W/g, "").length === 0) {
            $par.remove();
        } else {
            if ($this.text().replace(/\W/g, "").length === 0) {
                $this.remove();
            }
        }
    });

    // Insert microdata content
    if (window.selectedRange) {
        window.selectedRange.deleteContents();
        window.selectedRange.insertNode($($form.html().compressMarkup())[0]);
    } else {
        $("#insertion").replaceWith($($form.html().compressMarkup())[0]);
    }

    CreateDefaultSelection();
}

// Create default selection marker
function CreateDefaultSelection() {
    var $editor = $("div[id^=taTextElement]"),
        $cursor = $("<span />", { id: "insertion" });

    $editor.append($cursor);
    $editor.focus();
}

// Save current selection marker
function SetSelectionMarker() {
    var sel = window.getSelection();

    if (sel.getRangeAt && sel.rangeCount) {
        $("#insertion").remove();  // remove current selection marker
        var range = sel.getRangeAt(0);
        window.selectedRange = range.toString().length ? range : null;
        var $cursor = $("<span />", { id: "insertion" });
        range.insertNode($cursor[0]);
    }

    $("div[id='submitted-markup']").html(''); // clear submitted markup field
}

// Set default values for datetime-local fields
function SetFormFieldDefaults() {
    var currentDatetime = (new Date()).getCurrentDatetime();

    $("input[type='datetime-local']").each(function () {
        var $this = $(this);
        $this.val(currentDatetime);
        $this.closest("[itemprop]").prop("content", currentDatetime);
    });
}

// Date.prototype to get current datetime to string
function GetCurrentDatetime() {
    var pad = function (s) {
        return ('0' + s).slice(-2);
    }

    return this.getFullYear() +
      '-' + pad(this.getMonth() + 1) +
      '-' + pad(this.getDate()) +
      'T' + pad(this.getHours()) +
      ':' + pad(this.getMinutes());
}

// String.prototype to remove whitespace from markup
function CompressMarkup() {
    return $.trim(this.replace(/\s+\</g, " <").replace(/\>\s+\</g, "><"));
}

// Set-up prototypes, controls and events
function Init() {
    Date.prototype.getCurrentDatetime = Date.prototype.getCurrentDatetime || GetCurrentDatetime;
    String.prototype.compressMarkup = String.prototype.compressMarkup || CompressMarkup;

    var $editor = $("div[id^=taTextElement]"),
        $submit = $("form[name='editorFrm'] button.btn-submit"),
        $insert = $("#insert-item-list"),
        $dialog = $("#dialog-form");

    // Set-up RTE editor. Create default selection marker
    $editor.on("selectionend mouseup keyup", SetSelectionMarker);
    CreateDefaultSelection();

    // Set-up submit-markup button
    $submit.on("click", SubmitMarkup);

    // Set-up microdata-item modal
    function CreateModalDialog(title) {
        $dialog.dialog({
            autoOpen: false,
            width: 400,
            modal: true,
            title: title,
            buttons: {
                "Insert": function () {
                    InsertMicrodataContent($(this).clone());
                    $(this).dialog("close");
                },
                "Cancel": function () {
                    $(this).dialog("close");
                }
            },
            close: function () {
                $insert.val(-1).selectmenu("refresh");
                $editor.focus();
            }
        });
    }

    // Set-up microdata-items droplist
    $insert.selectmenu({
        change: function (event, data) {
            var selectedItem = data.item.value,
                templateUrl;
            if (selectedItem !== "-1") {
                templateUrl = "templates/" + selectedItem.toLowerCase() + ".html";
                $.get(templateUrl, function (data) {
                    if (data.length) {
                        CreateModalDialog("Insert " + selectedItem);
                        $dialog.html(data);
                        SetFormFieldDefaults();
                        $dialog.dialog("open");
                    }
                });
            }
        }
    });
}

// Document ready, initialize editor
$(function () {
    Init();
});
