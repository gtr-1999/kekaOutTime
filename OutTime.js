
// ==UserScript==
// @name         outTime
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  🏃🏢
// @author       G0
// @match        https://paltech.keka.com
// @icon         https://www.google.com/s2/favicons?sz=64&domain=keka.com
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js
// @require      https://gist.github.com/raw/2625891/waitForKeyElements.js
// @require      https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js
// @grant        GM_addStyle
// ==/UserScript==

/* global waitForKeyElements */
/* global bootstrap */

(function() {
    'use strict';

    const ACCESS_TOKEN = localStorage.getItem("access_token");
    const API_URL = "https://paltech.keka.com/k/attendance/api/mytime/attendance/summary";
    const SHIFT_EFFECTIVE_DURATION = 5.6;

    waitForKeyElements("employee-shift-detials .card-body", hitKekaAPI);

    /* ----------- Gets today's attendance log by hitting Keka's attendance summary API ----------- */
    function hitKekaAPI(){

        const XHR = new XMLHttpRequest();

        XHR.open("GET", API_URL);

        XHR.setRequestHeader("content-type", "application/json; charset=utf-8");
        XHR.setRequestHeader("accept", "application/json, text/plain, */*");
        XHR.setRequestHeader("Authorization", `Bearer ${ACCESS_TOKEN}`);

        XHR.addEventListener("load", (e) => {
            /* -------- Load response and filter to get today's log --------- */
            var attendanceSummary = JSON.parse(XHR.responseText).data;
            var n = attendanceSummary.length;
            var todayLog = attendanceSummary[n - 1];

            /* ------------------- Process the target log -------------------  */
            process(todayLog);
        });

        XHR.send();
    };


    /* ----------- Calculates total effective hours (tef) and out time (ot) from the given log (today's) ------------ */
    function process(todayLog) {

        var tef = todayLog.totalEffectiveHours;
        var tefHHMM = todayLog.effectiveHoursInHHMM;
        var lastLogOfTheDay = new Date(todayLog.lastLogOfTheDay);
        var shiftEffectiveDuration = SHIFT_EFFECTIVE_DURATION ? SHIFT_EFFECTIVE_DURATION : todayLog.shiftEffectiveDuration;

        /* ------------------------ Weekend ------------------------- */
        if(todayLog.dayType == 2) {
            return inject(todayLog.effectiveHoursInHHMM, 'Weekend bruh!');
        }

        /* ------------------------ On Leave ------------------------- */
        if(todayLog.leaveDayStatus == 1) {
            return inject(todayLog.effectiveHoursInHHMM, 'Leave roju laptop enti ?');
        }

        /* ----------------- Not reached office yet ----------------- */
        if(todayLog.firstLogOfTheDay == null) {
            return inject(todayLog.effectiveHoursInHHMM, 'Mundhu office ki randi 😛');
        }

        /* -------- Options for datetime to string conversion ------- */
        var dtOptions = {
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        };

        /* ----------------------------------- When techie is currently logged out --------------------------- */
        var viop = todayLog.validInOutPairs;

        if(viop.length) {
            var lastLog = viop[viop.length - 1];
            var lastLogInTime = lastLog.inTime;
            var lastLogOutTime = lastLog.outTime;
            lastLogOutTime += lastLogOutTime.includes('Z') ? '' : 'Z' ;
            lastLogOutTime = new Date(lastLogOutTime);
            if(lastLogOutTime.getTime() == lastLogOfTheDay.getTime()){
                return inject(tefHHMM, lastLogOutTime.toLocaleString('en-US', dtOptions));
            }
        }

        /* ------------------------------------ When techie is currently logged in --------------------------- */

        /* ------------- Total Effective Hours Calculation ------------ */
        var tefDuration = getFloatTimeInMilliseconds(tef);
        var now = new Date();
        tef = getMillisecondsInTimeObj(now - lastLogOfTheDay + tefDuration);

        /* ------------------- Out Time Calculation ------------------- */
        var outTime = lastLogOfTheDay;
        shiftEffectiveDuration = getFloatTimeInMilliseconds(shiftEffectiveDuration);
        outTime.setTime(lastLogOfTheDay.getTime() + shiftEffectiveDuration - tefDuration);

        /* -------------- TEF and OT objects to strings -------------- */
        tef = `${tef.hour}h ${tef.minute}m`
        outTime = outTime.toLocaleString('en-US', dtOptions);

        /* ----------- Inject the calculated data into keka ---------- */
        return inject(tef, outTime);
    }


    /* ----------- Adds calculated data to Timings section in keka's attendance page ------------ */
    function inject(tef, outTime) {

        /* ------------------- Timings Div (Keka) ------------------- */
        var cardBodyEl = document.querySelector("employee-shift-detials .card-body");

        cardBodyEl.children[1].classList.remove("mt-auto");
        cardBodyEl.children[1].classList.add("my-auto");

        /* ----------------------- TEF div -------------------------- */
        var tefDiv = document.createElement("div");
        tefDiv.className = "col-6";

        var tefHeader = document.createElement("span");
        tefHeader.className = "text-small";
        tefHeader.innerText = "Total Effective Hours: ";

        var tefValue = document.createElement("strong");
        tefValue.className = "tef-val";
        tefValue.style.color = "var(--primary-color)";
        tefValue.innerText = tef;

        tefDiv.appendChild(tefHeader);
        tefDiv.appendChild(tefValue);

        /* ------------------------- OT div -------------------------- */
        var otDiv = document.createElement("div");
        otDiv.className = "col-6";

        var otHeader = document.createElement("span");
        otHeader.className = "text-small";
        otHeader.innerText = "Out Time: ";

        var otValue = document.createElement("strong");
        otValue.className = "ot-val";
        otValue.style.color = "var(--primary-color)";
        otValue.innerText = outTime;

        otDiv.appendChild(otHeader);
        otDiv.appendChild(otValue);

        /* ----------------------- Snacks div ------------------------ */
        const snacks = [
            "🍚 Uggani & Mirchi Bajji 🌭", "🍟 Mixture or Chips 🍟", "🥯 Dahi Vada 🥯", "🍲 Idli 🍲", "🥟 Aalu Samosa 🥟", "🙃 Eerojuki edokati kanicheyi 🙃", "☺️ Zomato mama ni adugu ☺️",
            "🥣 Chat or Chips 🍟", "🥪 Veg Puff 🥪", "🥞 Kachori 🥞", "🌰 Mysore Bonda 🌰", "🥟 Corn Samosa 🥟", "😁 Office ki velli biscuits lepeyi 😁", "😅 Eeroju em tintavle 😅",
            "🥯 Vada 🥯", "🧆 Pakodi or Aalu Bajji 🌭", "🍉 Fruits or Sweet Corn 🌽", "🥘 Set Dosa 🥘", "🍱 Pav Baaji 🍱", "😟 Break ivvu koddiga 😟", "😊 Swiggy babai tho matladu 😊",
            "🥗 Punugu 🥗", "🥪 Bread Toast (Veg) 🥪", "🍎 Fruits or Onion Samosa 🥟", "🥮 Masala Vada 🥮", "😋 Panipuri 😋", "😌 Gudiki vellu 😌","🏍 Long ride ki vellochuga 🚗"
        ];
        const startedOn = new Date('Jan 9, 2023');
        const daysPassed = Math.floor((new Date().getTime() - startedOn.getTime()) / 86400000);

        const snacksDiv = document.createElement("div");
        snacksDiv.className = "col-1 mx-auto text-center";

        const snacksButton = document.createElement("button");
        snacksButton.className = "border-0 bg-transparent p-0";

        const snacksEmoji = document.createElement("span");
        snacksEmoji.innerText = "🍔";
        snacksEmoji.style.cursor = "pointer";

        const snacksToday = daysPassed < 0 ? snacks[snacks.length + daysPassed] : snacks[daysPassed % snacks.length];

        /* Tooltip arrow color, popover css override */
        const customStyle = document.createElement("style");
        const customCSS = `
            .bs-tooltip-top .tooltip-arrow,
            .bs-tooltip-top .tooltip-arrow::before,
            .bs-tooltip-top .tooltip-arrow::after
            {
                border-top-color: #6d7584 !important;
            }

            .bs-tooltip-bottom .tooltip-arrow,
            .bs-tooltip-bottom .tooltip-arrow::before,
            .bs-tooltip-bottom .tooltip-arrow::after
            {
                border-bottom-color: #6d7584 !important;
            }

            .bs-tooltip-start .tooltip-arrow,
            .bs-tooltip-start .tooltip-arrow::before,
            .bs-tooltip-start .tooltip-arrow::after
            {
                border-left-color: #6d7584 !important;
            }

            .bs-tooltip-end .tooltip-arrow,
            .bs-tooltip-end .tooltip-arrow::before,
            .bs-tooltip-end .tooltip-arrow::after
            {
                border-right-color: #6d7584 !important;
            }

            .bs-popover-top .popover-arrow::after
            {
                border-top-color: var(--secondary-background-color) !important;
            }

            .bs-popover-bottom .popover-arrow::after,
            .bs-popover-bottom .popover-header::before
            {
                border-bottom-color: var(--secondary-background-color) !important;
            }

            .bs-popover-start .popover-arrow::after
            {
                border-left-color: var(--secondary-background-color) !important;
            }

            .bs-popover-end .popover-arrow::after
            {
                border-right-color: var(--secondary-background-color) !important;
            }

            .popover-header {
                text-align: center;
                color: var(--primary-color);
                font-weight: bold;
                font-size: 1.1rem;
            }

            .popover-body {
                color: var(--primary-color-text) !important;
            }

            .snacks-popover {
                width: 800px;
                max-width: 800px !important;
            }
        `;
        customStyle.appendChild(document.createTextNode(customCSS));
        document.head.appendChild(customStyle);

        /* Snacks table */
        bootstrap.Tooltip.Default.allowList.table = [];
        bootstrap.Tooltip.Default.allowList.thead = [];
        bootstrap.Tooltip.Default.allowList.tbody = [];
        bootstrap.Tooltip.Default.allowList.tr = [];
        bootstrap.Tooltip.Default.allowList.td = [];
        bootstrap.Tooltip.Default.allowList.div=[];
        bootstrap.Tooltip.Default.allowList.script=[];

        const snacksTable = `
        <div class="table-responsive">
            <table class="table table-bordered border-top snacks-table">
                <thead>
                    <tr class="fw-bold">
                        <td></td>
                        <td>1st Week</td>
                        <td>2nd Week</td>
                        <td>3rd Week</td>
                        <td>4th Week</td>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="fw-bold">Monday</td>
                        <td>Uggani & Mirchi Bajji</td>
                        <td>Chat or Chips</td>
                        <td>Vada</td>
                        <td>Punugu</td>
                    </tr>
                    <tr>
                        <td class="fw-bold">Tuesday</td>
                        <td>Mixture or Chips</td>
                        <td>Veg Puff</td>
                        <td>Pakodi or Aalu Bajji</td>
                        <td>Bread Toast (Veg)</td>
                    </tr>
                    <tr>
                        <td class="fw-bold">Wednesday</td>
                        <td>Dahi Vada</td>
                        <td>Kachori</td>
                        <td>Fruits or Sweet corn</td>
                        <td>Fruits or Onion Samosa</td>
                    </tr>
                    <tr>
                        <td class="fw-bold">Thursday</td>
                        <td>Idli</td>
                        <td>Mysore Bonda</td>
                        <td>Set Dosa</td>
                        <td>Masala Vada</td>
                    </tr>
                    <tr>
                        <td class="fw-bold">Friday</td>
                        <td>Aalu Samosa</td>
                        <td>Corn Samosa</td>
                        <td>Pav Baaji</td>
                        <td>Panipuri</td>
                    </tr>
                </tbody>
            </table>
        </div>
        `;

        /* Initialize bootstrap tooltip */
        const snacksTooltip = new bootstrap.Tooltip(snacksEmoji, {title: snacksToday});
        const snacksPopover = new bootstrap.Popover(snacksButton, {title: "Snacks", container: snacksButton, content: snacksTable, customClass: "snacks-popover", html: true, placement: "bottom", trigger: "focus"});

        /* Highlight today snacks in the snacks table */
        snacksButton.addEventListener("click", () => {
            snacksTooltip.hide();
            document.querySelectorAll('.snacks-table td').forEach(cell => {
                const snacksTodayWithoutEmojis = snacksToday.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim();
                if(snacksTodayWithoutEmojis === cell.innerText)
                {
                    cell.style.color = "var(--primary-color)";
                    cell.classList.add("fw-bold");
                }
            });
        });

        snacksButton.appendChild(snacksEmoji);
        snacksDiv.appendChild(snacksButton);

        /* --------------- New Div to hold TEF, Snacks & OT ----------------- */
        var divG0 = document.createElement("div");
        divG0.className = "row my-auto g0-div justify-content-center align-items-center";

        /* ------- Add TEF div, Snacks div & OT div to the newly created div ------- */
        divG0.appendChild(tefDiv);
        // divG0.appendChild(snacksDiv);
        divG0.appendChild(otDiv);

        /* ---------------- Add new div to timings div ----------------*/
        cardBodyEl.appendChild(divG0);
    }


    /* --------------------------- Helper functions -------------------------------- */
    function getFloatTimeInMilliseconds(duration) {
        /* Converts (time of float) to (time of int in milliseconds)

           @arg duration: float

           return type: int

           Example:
           // 8.5 = 8h 30m
           getTimeInMilliseconds(8.5) -> 30600000
        */
        if(duration == 0){
            return 0;
        }

        duration = duration.toString();
        if(!duration.includes('.')) {
            duration += '.00';
        }

        var hr = parseInt(duration.split('.')[0]);
        var min = parseInt(duration.split('.')[1].padEnd(2, 0)) * 6 / 10;

        return ((hr * 60) + min) * 60 * 1000;
    }

    function getMillisecondsInTimeObj(milliseconds) {
        /* Converts (time of int) to (time of obj consisting day, hour, minute, seconds)

           @arg milliseconds: int

           return type: obj -> { day: int, hour: int, minute: int, seconds: int }

           Example:
           getMillisecondsInTimeObj(30600000) -> {day: 0, hour: 8, minute: 30, seconds: 0}
        */
        var day, hour, minute, seconds;

        seconds = Math.floor(milliseconds / 1000);
        minute = Math.floor(seconds / 60);
        seconds = seconds % 60;
        hour = Math.floor(minute / 60);
        minute = minute % 60;
        day = Math.floor(hour / 24);
        hour = hour % 24;

        return {
            day: day,
            hour: hour,
            minute: minute,
            seconds: seconds
        };
    }
    /* ---------------------------- G0 ------------------------------- */
    
})();
