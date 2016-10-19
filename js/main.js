var game_sock = new WebSocket('ws://localhost:9003');
var chat_sock = new WebSocket('ws://localhost:9002');

function htmlEncode(value) {
    //create a in-memory div, set it's inner text(which jQuery automatically encodes)
    //then grab the encoded contents back out.  The div never exists on the page.
    return $('<div/>').text(value).html();
}

function htmlDecode(value) {
    return $('<div/>').html(value).text();
}

function get_console_tab() {
    return $("#server-information .table");
}

function get_chat_tab(name) {
    return $("#chat-" + name + " .table");
}

function get_active_chat_tab() {
    var nav_tabs = $(".nav.nav-tabs");
    var active = nav_tabs.find(".active").attr('id');
    console.log("get_active_chat_tab:", active);

    if (active === "server-information-tab")
        active = "";
    return active;
}

function chat_submit() {
    // $("#server-information .table").append(make_chat_entry("DenseCrab", "Test NEW UI",""));
    var input = $("#btn-input").val();
    if (input === "")
        return;

    var active = get_active_chat_tab();
    if (active !== "") {
        console.log(active, input);
        chat_sock.send('{"send":{"to":"#' + active + '","msg":"' + input + '"}}');
    }
    $("#btn-input").val("");
}

$("#btn-chat").click(chat_submit);
$("#btn-input").bind('keypress',
    function(evt) {
        var code = evt.keyCode || e.which;
        if (code === 13)
            chat_submit();
    }
);

function make_chat_entry(header, body, time) {
    var item = '<tr class="chat-entry"><td class="time">' + (time !== undefined ? time : '') + '</td>' +
        '<td class="usr">' + header + '</td>' +
        '<td class="msg">' + body + '</td></tr>';
    return item;
}

function make_chat_tab(channel) {
    var item = '<li id="' + channel + '"><a data-toggle="tab" href="#chat-' + channel + '">#' + channel + '</a></li>';
    return item;
}

function make_chat_body(channel) {
    var item = '<div id="chat-' + channel + '" class="tab-pane fade"> <div class="col-xs-8 chatcol"><table class="table"></table></div><div class="col-xs-4 userscol"></div></div>';
    return item;
}

function create_chat_message(input) {
    console.log(input);
}

function load_stored_settings() {
    var settings = {
        username: "",
        token: ""
    };

    var username = localStorage.getItem('username');
    if (username !== undefined)
        settings["username"] = username;

    var token = localStorage.getItem('token');
    if (token !== undefined)
        settings["token"] = token;

    return settings;
}

var game_authed = false;
var chat_authed = false;

var settings = load_stored_settings();
if (!game_authed && settings.username !== "" && settings.token !== "") {
    //...
}

if (!chat_authed && settings.username !== "" && settings.token !== "") {
    //...
}

game_sock.onopen = function() {
    console.log("Connection to game server established");

    game_sock.send('{"auth":{"user":"' + settings.username + '","token":"' + settings.token + '"}}');
    var server_info = get_console_tab();

    var item = make_chat_entry("", "Authenticating as user " + settings.username + " on game server.");
    server_info.append(item);
};

game_sock.onmessage = function(evt) {
    var msg = JSON.stringify(evt.data);
    var obj = JSON.parse(evt.data);

    console.log(msg);

    var server_info = get_console_tab();

    if (obj["auth"]) {
        var auth_res = obj["auth"]["success"] === true ? "success" : "failure";
        server_info.append(make_chat_entry("", "Authentication " + auth_res));
        game_sock.send('{"roll":{"target":1998,"condition_high":true,"amount":1}}');
    } else {
        console.log("other", obj);
        var item = make_chat_entry("", msg, new Date().toLocaleString());
        server_info.append(item);
    }
};

chat_sock.onopen = function() {
    console.log("Connection to chat server established");

    var username = localStorage.getItem('username');
    var token = localStorage.getItem('token');
    //console.log(username, token);

    chat_sock.send('{"auth":{"user":"' + username + '","token":"' + token + '"}}');
    var server_info = get_console_tab();

    var item = make_chat_entry("", "Authenticating as user " + username + ".");
    server_info.append(item);
};

chat_sock.onmessage = function(evt) {
    var msg = JSON.stringify(evt.data);
    var obj = JSON.parse(evt.data);

    var server_info = get_console_tab();

    if (obj["auth"]) {
        var auth_res = obj["auth"]["success"] === true ? "success" : "failure";
        server_info.append(make_chat_entry("", "Authentication " + auth_res));
        chat_sock.send('{"join":{"channel":"#FightClub"}}');
    } else if (obj["join"]) {
        if (!obj["join"]["success"] === true) {
            server_info.append(make_chat_entry("", "Failed to join channel " + obj["join"]["channel"]));
            return;
        }

        var channel = obj["join"]["channel"];
        server_info.append(make_chat_entry("", 'You have joined ' + channel));
        channel = channel.substr(1, channel.length);

        var chat_tab = make_chat_tab(channel);
        var chat_body = make_chat_body(channel);

        $(".nav.nav-tabs").append(chat_tab);
        $(".tab-content").append(chat_body);
    } else if (obj["send"]) {
        var success = obj["send"]["success"] === true;

        server_info.append(make_chat_entry("", "send " + (success ? "success" : "failure")));
    } else if (obj["msg"]) {
        var from = obj["msg"]["from"];
        if (from[0] === '#')
            from = from.substr(1, from.length);

        var user = obj["msg"]["user"];
        console.log("incoming msg", from, user, msg);
        var chat_msg = obj["msg"]["msg"];
        var chat_entry = make_chat_entry('&lt;' + user + '&gt;&nbsp;', chat_msg);
        var chan = $("#chat-" + from).find("ul");
        console.log(chan.length);
        chan.append(chat_entry);
    } else {
        console.log("other", obj);
        var item = make_chat_entry("", msg, new Date().toLocaleString());
        server_info.append(item);
    }
};


//Add chat-tab

//remove panel footer on click
$("a[href='#add-tab']").on("click", function() {
    $("#chatcol .panel-footer").addClass("invisible");
});

$("a[href!='#add-tab']").on("click", function() {
    $("#chatcol .panel-footer").removeClass("invisible");
});

$("#add-tab #usrname").on("keyup", function(event) {
    if ($(this).val() !== "")
        $("#add-tab #add-user").removeClass("disabled");
    else
        $("#add-tab #add-user").addClass("disabled");
});

$("#add-tab #usrname").keypress(function(e) {
    if (e.which == 13)
        $("#add-tab #add-user").trigger("click");
});

$("#add-tab #add-user").on("click", function() {
    if (!$(this).hasClass("disabled")) {
        var usernameinput = $("#add-tab #usrname");

        $("#add-tab #added-users").prepend('<a href="#" class="list-group-item">' + usernameinput.val() + '</a>');
        usernameinput.val("").focus();
    }
});

//make-chat-tab
$('#add-tab #add-tab-btn').on('click', function() {
    $('#chatcol-chat .nav-tabs #add-tab-tab').before(make_chat_tab($('#add-tab #chat-name').val()));
    $('#chatcol-chat .tab-content').append(make_chat_body($('#add-tab #chat-name').val()));
});


//SWITCH
$("#arrow").on("click", function() {
    if ($("i", this).hasClass("fa-arrow-up")) {
        $("i", this).removeClass("fa-arrow-up").addClass("fa-arrow-down");
        $("#betcol #game").prop('checked', false);

    } else {
        if ($("i", this).hasClass("fa-arrow-down")) {
            $("i", this).removeClass("fa-arrow-down").addClass("fa-arrow-up");
            $("#betcol #game").prop('checked', true);
        }
    }
});

//MINMAXSHIT
$("#btnsbet #max").on("click", function() {
    $("#betcol #bet").val($("#balcol #bal").html());
});

$("#btnsbet #min").on("click", function() {
    $("#betcol #bet").val("0.00000000");
});

$("#btnsbet #half").on("click", function() {
    $("#betcol #bet").val(($("#betcol #bet").val() / 2).toFixed(8));
});

$("#btnsbet #double").on("click", function() {
    $("#betcol #bet").val(($("#betcol #bet").val() * 2).toFixed(8));
});


//Winchance - Multiplier 
var edge = 1 / 100;

$("#betcol #multiplier").numeric();
$("#betcol #winchance").numeric();

$("#betcol #winchance").on("keyup", function() {
    $("#betcol #multiplier").val(calculateWinchanceMultiplier($(this).val()));
});

$("#betcol #multiplier").on("keyup", function() {
    $("#betcol #winchance").val(calculateWinchanceMultiplier($(this).val()));
});

function calculateWinchanceMultiplier(input) {
    var wm = 100 / input;
    var edgedwm = (wm - wm * edge).toFixed(2);
    console.log(wm);
    console.log(edgedwm);
    return edgedwm;
}

//table bets
$("#betcol #roll").on("click", function() {
    var dt = new Date();
    var time = dt.getHours() + ":" + dt.getMinutes() + ":" + dt.getSeconds();

    $("#bets tbody").prepend(
        "<tr>" +
        "<td>" + Math.floor(Math.random() * 10000000) + 1 + "</td>" +
        "<td>" + "DenseCrab" + "</td>" +
        "<td>" + time + "</td>" +
        "<td>" + $("#betcol #bet").val() + "</td>" +
        "<td>" + $("#betcol #multiplier").val() + "x</td>" +
        "<td>" + (($("#betcol #game").prop("checked") == true) ? "HI" : "LO") + "</td>" +
        "<td>" + (Math.random() * (99.99)).toFixed(2) + "</td>" +
        "<td>" + "kwet" + "</td>" +
        "</tr>"
    )
});

