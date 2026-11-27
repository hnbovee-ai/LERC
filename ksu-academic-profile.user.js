// ==UserScript==
// @name         KSU Research Profile - English Navigation
// @namespace    KSU Research Profile
// @version      1.9.7
// @description  English navigation, action buttons and publication/presentation entry assistants
// @match        https://ras2.kyusan-u.ac.jp/kysap/*
// @updateURL    https://raw.githubusercontent.com/hnbovee-ai/LERC/main/ksu-academic-profile.user.js
// @downloadURL  https://raw.githubusercontent.com/hnbovee-ai/LERC/main/ksu-academic-profile.user.js
// @run-at       document-idle
// @grant        none
// @noframes
// ==/UserScript==

(function () {
    'use strict';
    const MENU_ID = 'ksu-english-navigation';
    const STORAGE_KEY = 'ksu-active-menu-item';
    const MENU_SELECTOR = 'td.submenu a.submenu';
    const normalize = text => String(text ?? '').normalize('NFKC')
        .replace(/[\s\u200B-\u200D\uFEFF]/g, '')
        .replace(/^[*＊★☆※◆◇]+|[*＊★☆※◆◇]+$/g, '');
    const rowKey = text => normalize(text).replace(/[*＊]/g, '').replace(/[:：]$/, '').toLowerCase();
    const all = (root, selector) => Array.from(root.querySelectorAll(selector));
    const isLoginPage = all(document, '.header-title').some(e => normalize(e.textContent).includes('ログインページ'));
    if (isLoginPage) { sessionStorage.removeItem(STORAGE_KEY); return; }
    const page = location.pathname.split('/').filter(Boolean).pop();
    const isMainPage = ['P200', 'P300'].includes(page);
    const isHomePage = page === 'P820';
    const isEditingPage = page === 'P850';
    const hasYearFilter = ['P7211', 'P7231', 'P850'].includes(page);
    const isPresentation = page === 'P7231';
    const hasEntryAssistant = page === 'P7211' || isPresentation;
    const menuItems = [
        ['Preview page', '公開HPプレビュー', 'preview'],
        ['Personal info', '個人情報', 'required'],
        ['Education', '学歴', 'required'],
        ['Publications', '学術雑誌', 'required'],
        ['Presentations', '学会発表', 'required'],
        ['Research field', '現在の専門分野', 'required'],
        ['Research topics', '研究テーマ', 'required'],
        ['Courses', '授業科目', 'required'],
        ['Student message', '学生のみなさんへのメッセージ', 'required'],
        ['Employment', '職歴', 'optional'],
        ['Academic societies', '所属学会', 'optional'],
        ['Research grants', '研究課題・受託研究・科研費', 'optional'],
        ['Email', 'メールアドレス', 'optional'],
        ['Personal website', 'ホームページ', 'optional']
    ];
    const colors = { preview: '#288252', required: '#3268A8', optional: '#737B85', orange: '#D97706' };
    const activeColors = { required: '#14365D', optional: '#343A40' };
    // Detect the original researcher menu on any page, not just P820/P850.
    function findResearcherMenu() {
        const cells = all(document, 'td.submenu');
        const headed = cells.find(cell => all(cell, '.submenu-item').some(
            e => normalize(e.textContent).replace(/^[・･>＞]+/, '') === '研究者情報'
        ));
        if (headed) return headed;
        // Fallback for variants of the same sidebar without its normal heading.
        return cells.find(cell => {
            const labels = new Set(all(cell, 'a.submenu').map(a => normalize(a.textContent)));
            return labels.has('公開HPプレビュー') && menuItems.filter(([,jp,category]) =>
                category !== 'preview' && labels.has(normalize(jp))).length >= 2;
        }) || (isHomePage || isEditingPage ? cells.find(cell => cell.querySelector('a.submenu')) : null) || null;
    }
    const hasProfileMenu = Boolean(findResearcherMenu()) || isHomePage || isEditingPage;
    function profileLinks() {
        const menu = findResearcherMenu();
        return menu ? all(menu, 'a.submenu') : (isHomePage || isEditingPage ? all(document, MENU_SELECTOR) : []);
    }
    function findProfileLink(japanese) {
        return profileLinks().find(a => normalize(a.textContent) === normalize(japanese));
    }
    function detectActiveItem() {
        const menu = findResearcherMenu();
        if (menu) {
            // The current section is normally plain text rather than a link.
            const matches = all(menu, '.menulist').flatMap(row => {
                const label = row.querySelector('[class*="menulist-string"]') || row;
                const jp = normalize(label.textContent).replace(/^[>＞・･]+/, '');
                const item = menuItems.find(([,name,category]) => category !== 'preview' && normalize(name) === jp);
                return item && !all(row, 'a.submenu').some(a => normalize(a.textContent) === jp) ? [jp] : [];
            });
            if (new Set(matches).size === 1) return matches[0];
        }
        // Recognize titles on detail pages, including new/edit variants.
        for (const header of all(document, '.header-title')) {
            const title = normalize(header.textContent);
            const item = menuItems.find(([,name,category]) => category !== 'preview' &&
                [name, name+'新規登録', name+'登録', name+'変更', name+'編集', name+'一覧'].some(t => normalize(t) === title));
            if (item) return normalize(item[1]);
        }
        if (page === 'P7211') return normalize('学術雑誌');
        if (page === 'P7231') return normalize('学会発表');
        return isEditingPage ? sessionStorage.getItem(STORAGE_KEY) || '' : '';
    }
    if (isHomePage || isMainPage) sessionStorage.removeItem(STORAGE_KEY);
    let activeItem = hasProfileMenu && !isHomePage ? detectActiveItem() : '';
    if (hasProfileMenu && activeItem) sessionStorage.setItem(STORAGE_KEY, activeItem);
    function setActiveItem(japanese) {
        activeItem = normalize(japanese);
        sessionStorage.setItem(STORAGE_KEY, activeItem);
        updateButtonStyles();
    }
    function updateButtonStyles() {
        const bar = document.getElementById(MENU_ID);
        if (!bar || !hasProfileMenu) return;
        all(bar, 'button[data-category]').forEach(button => {
            const category = button.dataset.category;
            const selected = button.dataset.japanese === activeItem && category !== 'preview';
            button.style.backgroundColor = selected ? activeColors[category] : colors[category];
            button.style.fontWeight = selected ? '700' : '500';
            button.style.border = selected ? '2px solid #E9AD35' : '2px solid transparent';
            button.style.boxShadow = selected ? '0 0 4px rgba(0,0,0,.35)' : 'none';
            if (selected) button.setAttribute('aria-current', 'page');
            else button.removeAttribute('aria-current');
        });
    }
    function openAcademicProfile() {
        const target = normalize('研究業績の編集ページへ');
        const find = selector => all(document, selector).find(e => normalize(e.textContent) === target);
        const link = find('a.menu-anchor') || find('a');
        if (!link) return alert('Academic profile editor link not found.');
        sessionStorage.removeItem(STORAGE_KEY);
        link.click();
    }
    function findTopMenuLink() {
        const links = all(document, 'td.header-button a');
        const callsMain = e => /\bdoMainMenu\s*\(/.test(e.getAttribute('onclick') || '');
        return links.find(callsMain) || links.find(e => normalize(e.textContent) === 'メニュー') ||
            all(document, 'a[onclick]').find(callsMain) || null;
    }
    function openTopMenu() {
        const link = findTopMenuLink();
        if (!link) return alert('Top menu link not found.');
        sessionStorage.removeItem(STORAGE_KEY);
        link.click();
    }
    // Use the bottommost visible original Back control, never browser history.
    function findOriginalBackButton() {
        const buttons = all(document, 'input[type="button"],input[type="submit"],button').filter(button => {
            if (button.closest('#' + MENU_ID + ',#ksu-publication-panel,#ksu-presentation-panel')) return false;
            const label = normalize(button.tagName === 'INPUT' ? button.value : button.textContent);
            if (!['戻る', 'Back'].includes(label)) return false;
            const style = getComputedStyle(button);
            return button.getClientRects().length > 0 && style.visibility === 'visible';
        });
        // Some entry pages have Back controls above and below the form.
        return buttons.reduce((last, button) => !last || button.getBoundingClientRect().bottom >= last.getBoundingClientRect().bottom ? button : last, null);
    }
    function openOriginalBack() {
        const button = findOriginalBackButton();
        if (button && !button.disabled && button.getAttribute('aria-disabled') !== 'true') button.click();
        else refreshTopBackButton();
    }
    function refreshTopBackButton(bar = document.getElementById(MENU_ID)) {
        if (!bar) return;
        const original = findOriginalBackButton();
        let button = bar.querySelector('#ksu-top-back');
        if (!original) {
            if (button) button.remove();
            return;
        }
        if (!button) {
            button = document.createElement('button');
            button.id = 'ksu-top-back'; button.type = 'button'; button.textContent = '← Back';
            button.style.cssText = hasProfileMenu
                ? 'background:#596675;color:white;border:2px solid #46515e;border-radius:4px;padding:6px 9px;font:700 12px/1.2 Arial,sans-serif;white-space:nowrap;cursor:pointer;box-sizing:border-box;'
                : 'background:#596675;color:white;border:2px solid #46515e;border-radius:5px;padding:10px 20px;min-width:110px;font:700 16px/1.2 Arial,sans-serif;white-space:nowrap;cursor:pointer;box-sizing:border-box;box-shadow:0 2px 5px #0004;';
            addHoverEffect(button); button.addEventListener('click', openOriginalBack);
            const top = bar.querySelector('#ksu-top-menu');
            if (top) top.after(button);
            else if (!hasProfileMenu && bar.firstElementChild) bar.firstElementChild.after(button);
            else bar.prepend(button);
        }
        const disabled = original.disabled || original.getAttribute('aria-disabled') === 'true';
        if (button.disabled !== disabled) button.disabled = disabled;
        button.style.opacity = disabled ? '0.5' : '1';
        button.style.cursor = disabled ? 'not-allowed' : 'pointer';
    }
    function clickMenuItem(japanese, english, category) {
        const target = normalize(japanese);
        const link = findProfileLink(japanese);
        if (!link) {
            if (target !== activeItem) alert('Menu item not found: ' + english);
            return;
        }
        if (category !== 'preview') setActiveItem(japanese);
        link.click();
    }
    document.addEventListener('click', event => {
        if (!(event.target instanceof Element)) return;
        const link = event.target.closest(MENU_SELECTOR);
        if (!link) return;
        const item = menuItems.find(entry => normalize(entry[1]) === normalize(link.textContent));
        if (item && item[2] !== 'preview') setActiveItem(item[1]);
        else if (!item) setActiveItem('');
    }, true);
    function addHoverEffect(button) {
        button.addEventListener('mouseenter', () => { button.style.filter = 'brightness(1.15)'; });
        button.addEventListener('mouseleave', () => { button.style.filter = 'none'; });
    }
    function createLargeButton(bar, label, action) {
        const button = document.createElement('button');
        button.type = 'button'; button.textContent = label;
        button.style.cssText = `background:${colors.orange};color:white;border:2px solid #B45309;
          border-radius:5px;padding:10px 20px;min-width:220px;font:700 16px/1.2 Arial,sans-serif;
          white-space:nowrap;cursor:pointer;box-sizing:border-box;box-shadow:0 2px 5px #0004;`;
        addHoverEffect(button); button.addEventListener('click', action); bar.append(button); return button;
    }
    function createLegend(bar) {
        const legend = document.createElement('div'); legend.id = 'ksu-navigation-legend';
        legend.style.cssText = 'flex-basis:100%;display:flex;flex-wrap:wrap;align-items:center;gap:20px;padding:3px 1px 0;font:12px/1.4 Arial,sans-serif;color:#606060;';
        for (const [label, color] of [['Required items', colors.required], ['Optional items', colors.optional]]) {
            const item = document.createElement('span'); item.style.cssText = 'display:inline-flex;align-items:center;gap:6px;white-space:nowrap;';
            const dot = document.createElement('span'); dot.style.cssText = `display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};`;
            item.append(dot, document.createTextNode(label)); legend.append(item);
        }
        bar.append(legend);
    }
    function createNavigation() {
        if (document.getElementById(MENU_ID) || (!hasProfileMenu && !isMainPage && !findTopMenuLink() && !findOriginalBackButton())) return;
        const bar = document.createElement('div'); bar.id = MENU_ID;
        bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:999999;display:flex;flex-wrap:wrap;align-items:center;gap:5px;padding:8px 10px;background:#f5f6f8;border-bottom:1px solid #c5c9ce;box-shadow:0 2px 5px #0002;box-sizing:border-box;font-family:Arial,sans-serif;';
        if (!hasProfileMenu && isMainPage) createLargeButton(bar, '✎  Edit academic profile  →', openAcademicProfile);
        else if (!hasProfileMenu) {
            if (findTopMenuLink()) createLargeButton(bar, '⌂  Top menu', openTopMenu).id = 'ksu-top-menu';
        } else {
            if (findTopMenuLink()) {
                const top = document.createElement('button'); top.id = 'ksu-top-menu'; top.type = 'button'; top.textContent = '⌂  Top menu';
                top.style.cssText = `background:${colors.orange};color:white;border:2px solid #B45309;border-radius:4px;padding:6px 9px;font:700 12px/1.2 Arial,sans-serif;white-space:nowrap;cursor:pointer;box-sizing:border-box;`;
                addHoverEffect(top); top.addEventListener('click', openTopMenu); bar.append(top);
            }
            for (const [english, japanese, category] of menuItems) {
                const button = document.createElement('button'); button.type = 'button'; button.textContent = english;
                button.dataset.japanese = normalize(japanese); button.dataset.category = category;
                button.style.cssText = `background:${colors[category]};color:white;border:2px solid transparent;border-radius:4px;padding:6px 9px;font:500 12px/1.2 Arial,sans-serif;white-space:nowrap;cursor:pointer;box-sizing:border-box;`;
                // A missing link is never replaced by a guessed URL or form action.
                if (!findProfileLink(japanese) && normalize(japanese) !== activeItem) {
                    button.disabled = true; button.style.opacity = '0.45'; button.style.cursor = 'not-allowed';
                    button.title = 'This section is not available on the current page.';
                }
                addHoverEffect(button); button.addEventListener('click', () => clickMenuItem(japanese, english, category)); bar.append(button);
            }
            createLegend(bar);
        }
        const initialPadding = parseFloat(getComputedStyle(document.body).paddingTop) || 0;
        document.body.append(bar);
        refreshTopBackButton(bar);
        const resize = () => { document.body.style.paddingTop = initialPadding + bar.offsetHeight + 'px'; };
        resize(); new ResizeObserver(resize).observe(bar); updateButtonStyles();
    }
    function installActionButtonStyles() {
        const style = document.createElement('style'); style.id = 'ksu-action-button-styles';
        style.textContent = `
          .ksu-add-new,.ksu-publication-submit{background:#D97706!important;color:white!important;border:2px solid #B45309!important;border-radius:5px!important;padding:8px 18px!important;min-width:100px!important;min-height:34px!important;height:auto!important;font:700 15px/1.2 Arial,sans-serif!important;cursor:pointer!important;box-sizing:border-box!important;box-shadow:0 2px 4px #0003;}
          .ksu-publication-submit{min-width:150px!important;min-height:44px!important;font-size:17px!important;}
          .ksu-year-label{font:700 16px/1.3 Arial,sans-serif!important;color:#173F70!important;margin-right:8px;vertical-align:middle;}
          select.ksu-year-filter{background:#fff!important;color:#173F70!important;border:2px solid #3268A8!important;border-radius:5px!important;padding:5px 9px!important;min-width:110px!important;min-height:32px!important;height:auto!important;font:700 14px/1.3 Arial,sans-serif!important;vertical-align:middle;cursor:pointer;box-sizing:border-box!important;}
          select.ksu-year-filter:focus{outline:2px solid #E9AD35;outline-offset:2px;}
          .ksu-edit{background:#3268A8!important;color:white!important;border-color:#24548A!important;border-radius:3px!important;cursor:pointer!important;}
          .ksu-add-new:hover:not(:disabled),.ksu-edit:hover:not(:disabled),.ksu-publication-submit:hover:not(:disabled){filter:brightness(1.15);}
          .ksu-add-new:disabled,.ksu-edit:disabled,.ksu-publication-submit:disabled{opacity:.5;cursor:not-allowed!important;}
        `;
        document.head.append(style);
    }
    const PANEL_ID = isPresentation ? 'ksu-presentation-panel' : 'ksu-publication-panel';
    function enhanceActionButtons() {
        for (const button of all(document, 'input[type="button"],button')) {
            if (button.closest('#' + MENU_ID + ',#' + PANEL_ID)) continue;
            const isInput = button.tagName === 'INPUT';
            const original = normalize(isInput ? button.value : button.textContent);
            const config = original === '新規登録' ? ['Add new', 'ksu-add-new'] : original === '変更' ? ['Edit', 'ksu-edit'] : null;
            const translation = config?.[0] || (original === '削除' ? 'Delete' : original === '戻る' ? 'Back' : null);
            if (!translation) continue;
            if (isInput) button.value = translation; else button.textContent = translation;
            if (config) button.classList.add(config[1]);
        }
    }
    // Translate the publication-list year filter without changing its values.
    function enhancePublicationYearFilter() {
        for (const select of all(document, 'select')) {
            if (select.closest('#' + PANEL_ID)) continue;
            const cell = select.closest('td');
            const labelText = cell ? Array.from(cell.childNodes).filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.nodeValue).join('') : '';
            const isYear = select.name === 'NYEARC' || select.classList.contains('ksu-year-filter') || /発行年度|発表年度/.test(labelText);
            if (!isYear) continue;
            if (!select.classList.contains('ksu-year-filter')) select.classList.add('ksu-year-filter');
            if (cell) {
                for (const node of cell.childNodes) {
                    if (node.nodeType === Node.TEXT_NODE && /発行年度|発表年度/.test(node.nodeValue)) {
                        const [before, after] = node.nodeValue.split(/発行年度|発表年度/, 2);
                        const label = document.createElement('label');
                        label.className = 'ksu-year-label';
                        label.textContent = 'Year';
                        if (!select.id) {
                            let id = 'ksu-year-filter';
                            let index = 1;
                            while (document.getElementById(id)) id = 'ksu-year-filter-' + index++;
                            select.id = id;
                        }
                        label.htmlFor = select.id;
                        node.replaceWith(document.createTextNode(before), label, document.createTextNode(after));
                    }
                }
            }
            for (const option of select.options) {
                const original = normalize(option.label);
                const year = original.match(/^(\d{4})年度$/);
                const english = original === '全年度' ? 'All years' : year ? year[1] : null;
                if (!english) continue;
                // Options without a value attribute derive their value from text.
                // Explicitly preserve that original value before translating.
                if (!option.hasAttribute('value')) option.value = option.value;
                if (option.hasAttribute('label')) option.label = english;
                if (option.textContent !== english) option.textContent = english;
            }
        }
    }

    function monitorActionButtons() {
        let scheduled = false;
        new MutationObserver(records => {
            if (!records.some(record => !(record.target instanceof Element ? record.target : record.target.parentElement)?.closest('#' + MENU_ID + ',#' + PANEL_ID))) return;
            if (scheduled) return; scheduled = true;
            requestAnimationFrame(() => { scheduled = false; enhanceActionButtons(); if (hasEntryAssistant) enhancePublicationSubmit(); if (hasYearFilter) enhancePublicationYearFilter(); if (!document.getElementById(MENU_ID) && findOriginalBackButton()) createNavigation(); refreshTopBackButton(); });
        }).observe(document.body, { childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:['value','disabled','aria-disabled','hidden','style','class'] });
    }

    // ============================================================
    // P7211: PUBLICATION ENTRY ASSISTANT
    // Uses the original form's Japanese row labels and controls.
    // Does not send, save, or submit any data automatically.
    // ============================================================
    const pubTypes = [
        ['論文','Research article'], ['解説・総説','Review / commentary'], ['研究ノート','Research note'],
        ['会議録','Conference proceedings'], ['調査報告','Survey report'], ['報告書関係','Report-related item'],
        ['新聞・Web等掲載関係','Newspaper / web publication'], ['解説・総説関係','Review-related item'],
        ['寄稿関係','Contributed article'], ['雑記寄稿関係','Miscellaneous contribution']
    ];
    const publicOptions = [['公開可','Yes'],['非公開','No']];
    const publicOrder = ['公開可','researchmap提供可(研究者間公開)','researchmap提供可(非公開)','非公開'];
    const languageOptions = [['日本語','Japanese'],['英語','English'],['中国語','Chinese'],['フランス語','French'],['スペイン語','Spanish'],['ロシア語','Russian'],['ドイツ語','German'],['その他','Other']];
    const peerOptions = [['査読あり','Yes'],['査読なし','No'],['その他(不明)','Unknown']];
    const invitedOptions = [['招待あり','Yes'],['招待なし','No'],['その他(不明)','Unknown']];
    const locationOptions = [['国内','Domestic (Japan)'],['国外','International (outside Japan)'],['不明','Unknown']];
    const detailFields = [
        ['doi','DOI','DOIコード'],
        ['permalink','Link to article','PermalinkURL']
    ];
    const simplePubTypes = pubTypes.filter(([jp]) => ['論文','解説・総説','会議録','寄稿関係'].includes(jp));
    const simplePubLanguages = languageOptions.slice(0,2);
    const simplePeerOptions = peerOptions.slice(0,2);
    const simpleInvitedOptions = invitedOptions.slice(0,2);
    const simpleLocationOptions = locationOptions.slice(0,2);
    const selectors = { texts:'input:not([type]),input[type="text"],input[type="number"],input[type="url"]', areas:'textarea', radios:'input[type="radio"]', checks:'input[type="checkbox"]', selects:'select' };
    function directRows(root, label) {
        return all(root, 'tr').filter(r => r.cells.length >= 2 && rowKey(r.cells[0].textContent) === rowKey(label));
    }
    function hasHelp(row) {
        return all(row.cells[1], 'input,button').some(e => normalize(e.tagName === 'INPUT' ? e.value : e.textContent) === '説明');
    }
    function getPublicationForm() {
        // This row is absent from the publication search form above the editor.
        const matches = directRows(document, isPresentation ? '発表言語' : '論文種別').filter(r => r.querySelector(isPresentation ? selectors.radios : 'select'));
        const helpMatches = matches.filter(hasHelp);
        const chosen = helpMatches.length === 1 ? helpMatches[0] : matches.length === 1 ? matches[0] : null;
        return chosen?.closest('form') || null;
    }
    function findRow(form, label, selector) {
        const matches = directRows(form, label).filter(r => r.querySelector(selector));
        const helpMatches = matches.filter(hasHelp);
        if (helpMatches.length === 1) return helpMatches[0];
        if (matches.length === 1) return matches[0];
        throw new Error(`${label}: ${matches.length ? 'multiple matching rows' : 'row not found'}`);
    }
    function controls(form, label, kind, expected) {
        const selector = selectors[kind];
        const row = findRow(form, label, selector);
        const elements = all(row, selector);
        if (expected !== undefined && elements.length !== expected) throw new Error(`${label}: expected ${expected} ${kind}, found ${elements.length}`);
        if (!elements.length) throw new Error(`${label}: no ${kind} found`);
        return elements;
    }
    function radioMap(form, label, ordered) {
        const row = findRow(form, label, selectors.radios);
        const radios = all(row, selectors.radios);
        if (radios.length !== ordered.length) throw new Error(`${label}: unexpected number of radio buttons`);
        // Prefer explicitly associated labels, if available.
        const byLabel = ordered.map(jp => radios.find(r => Array.from(r.labels || []).some(l => normalize(l.textContent) === normalize(jp))));
        if (byLabel.every(Boolean) && new Set(byLabel).size === radios.length) return new Map(ordered.map((jp,i) => [jp,byLabel[i]]));
        // Older KSU forms put bare text beside each radio. Verify displayed
        // labels occur in the same order as the screenshot before using order.
        const text = normalize(row.textContent);
        let offset = 0;
        for (const jp of ordered) {
            const index = text.indexOf(normalize(jp), offset);
            if (index < 0) throw new Error(`${label}: unable to verify radio labels`);
            offset = index + normalize(jp).length;
        }
        return new Map(ordered.map((jp,i) => [jp,radios[i]]));
    }
    function optionByText(select, label) {
        const matches = Array.from(select.options).filter(o => normalize(o.textContent) === normalize(label));
        if (matches.length !== 1) throw new Error(`Dropdown option not uniquely found: ${label}`);
        return matches[0];
    }
    function setValue(el, value) {
        if (!el || !el.isConnected || el.disabled || el.readOnly) throw new Error('An original field is unavailable or read-only.');
        const wanted = String(value ?? '');
        if (el.value === wanted) return;
        el.value = wanted;
        if (el.value !== wanted) throw new Error('An original field rejected a value.');
        el.dispatchEvent(new Event('input', {bubbles:true}));
        el.dispatchEvent(new Event('change', {bubbles:true}));
    }
    function setChecked(el, checked) {
        if (!el || !el.isConnected || el.disabled) throw new Error('An original radio button or checkbox is unavailable.');
        if (el.checked !== checked) el.click();
        if (el.checked !== checked) throw new Error('An original option rejected the selection.');
    }
    function getPublicationSubmit() {
        const form = getPublicationForm();
        if (!form) return null;
        // There can be a second registration control above the editor.
        // Match the original BSUBMT action, then use the last visible one.
        const matches = all(form, 'input[type="button"],button').filter(e => {
            const label = normalize(e.tagName === 'INPUT' ? e.value : e.textContent);
            return ['登録','Submit'].includes(label) && /\bsubmitForm\s*\(\s*['"]BSUBMT['"]/.test(e.getAttribute('onclick') || '') && e.getClientRects().length;
        });
        return matches.at(-1) || null;
    }
    function enhancePublicationSubmit() {
        const button = getPublicationSubmit();
        if (!button) return;
        if (button.tagName === 'INPUT') { if (button.value !== 'Submit') button.value = 'Submit'; }
        else if (button.textContent !== 'Submit') button.textContent = 'Submit';
        if (!button.classList.contains('ksu-publication-submit')) button.classList.add('ksu-publication-submit');
    }
    function installPanelStyles() {
        const style = document.createElement('style');
        style.textContent = `
          #${PANEL_ID}{position:fixed;right:0;bottom:0;width:min(370px,100vw);z-index:999998;display:flex;flex-direction:column;background:#f7f8fa;color:#20262d;border-left:1px solid #cbd2da;box-shadow:-3px 0 10px #0002;font:13px/1.35 Arial,sans-serif;text-align:left;box-sizing:border-box;}
          #${PANEL_ID} *{box-sizing:border-box;}
          #${PANEL_ID} [hidden]{display:none!important;}
          #${PANEL_ID} .kp-head{padding:11px 13px;background:#233e5c;color:white;display:flex;align-items:center;justify-content:space-between;gap:8px;}
          #${PANEL_ID} .kp-head strong{font-size:16px;}
          #${PANEL_ID} .kp-head button{background:#fff2;color:white;border:1px solid #fff7;padding:5px 8px;border-radius:4px;cursor:pointer;font:600 12px Arial;}
          #${PANEL_ID} form{display:flex;flex-direction:column;min-height:0;flex:1;margin:0;}
          #${PANEL_ID} .kp-scroll{overflow:auto;flex:1;min-height:0;padding:12px;}
          #${PANEL_ID} .kp-note{margin:0 0 10px;font-size:12px;color:#596675;}
          #${PANEL_ID} .kp-field{display:flex;flex-direction:column;gap:4px;min-width:0;margin:0 0 10px;}
          #${PANEL_ID} label{color:#233245;font:600 12px/1.3 Arial,sans-serif;display:block;}
          #${PANEL_ID} .kp-required{color:#ad2929;}
          #${PANEL_ID} input:not([type=checkbox]),#${PANEL_ID} textarea,#${PANEL_ID} select{display:block;width:100%;min-width:0;background:white;color:#20262d;border:1px solid #aeb8c3;border-radius:4px;padding:7px;font:13px/1.25 Arial,sans-serif;height:auto;margin:0;}
          #${PANEL_ID} textarea{min-height:55px;resize:vertical;}
          #${PANEL_ID} .kp-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 8px;}
          #${PANEL_ID} .kp-grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:0 8px;}
          #${PANEL_ID} .kp-check{display:flex;align-items:center;gap:6px;margin:0 0 10px;font-weight:400;}
          #${PANEL_ID} input[type=checkbox]{width:15px;height:15px;margin:0;}
          #${PANEL_ID} h3{font:700 13px Arial;color:#233e5c;margin:8px 0 10px;padding-top:9px;border-top:1px solid #d9dfe6;}
          #${PANEL_ID} details{border-top:1px solid #d9dfe6;padding:9px 0;}
          #${PANEL_ID} summary{cursor:pointer;font-weight:700;color:#233e5c;margin-bottom:8px;}
          #${PANEL_ID} .kp-footer{padding:10px 12px;border-top:1px solid #cbd2da;background:#fff;}
          #${PANEL_ID} .kp-actions{display:flex;gap:6px;}
          #${PANEL_ID} .kp-actions button{flex:1;min-width:0;cursor:pointer;border:0;border-radius:5px;padding:10px 6px;font:700 13px Arial;color:white;background:#3268A8;}
          #${PANEL_ID} .kp-actions button[type=button]{background:#596675;}
          #${PANEL_ID} button:disabled{opacity:.55;cursor:not-allowed;}
          #${PANEL_ID} .kp-status{font:12px/1.4 Arial;white-space:pre-wrap;overflow-wrap:anywhere;max-height:100px;overflow:auto;margin:0 0 7px;color:#405268;}
          #${PANEL_ID}.kp-collapsed{width:auto;bottom:auto;box-shadow:0 2px 8px #0002;}
          #${PANEL_ID}.kp-collapsed form{display:none;}
          .ksu-publication-submit{scroll-margin-top:110px;}
        `;
        document.head.append(style);
    }
    function createPublicationPanel() {
        if (document.getElementById(PANEL_ID)) return;
        const originalForm = getPublicationForm();
        if (!originalForm) { console.warn('KSU publication assistant: entry form not uniquely identified.'); return; }
        installPanelStyles(); enhancePublicationSubmit();
        const panel = document.createElement('aside'); panel.id = PANEL_ID;
        panel.setAttribute('aria-label','Publication entry assistant');
        panel.innerHTML = `<div class="kp-head"><strong>Publication entry</strong><button type="button" class="kp-toggle" aria-expanded="true">Hide</button></div>
          <form autocomplete="off"><div class="kp-scroll"><p class="kp-note">Enter details here, then click "Autofill form". Click "Submit" when complete.</p></div>
          <div class="kp-footer"><div class="kp-status" role="status" aria-live="polite">Ready to enter publication details.</div><div class="kp-actions"><button type="submit">Autofill form</button><button type="button" class="kp-jump">Go to Submit</button></div></div></form>`;
        const sideForm = panel.querySelector('form'); const scroll = panel.querySelector('.kp-scroll');
        const status = panel.querySelector('.kp-status'); const fillButton = sideForm.querySelector('button[type=submit]');
        const fields = {}; const dirty = new Set();
        function field(parent, id, label, options = {}) {
            const wrap = document.createElement('div'); wrap.className = 'kp-field';
            const lab = document.createElement('label'); lab.htmlFor = 'kp-' + id; lab.textContent = label;
            if (options.required || options.groupRequired) { const star = document.createElement('span'); star.className = 'kp-required'; star.textContent = ' *'; lab.append(star); }
            let input;
            if (options.choices) {
                input = document.createElement('select'); input.add(new Option('Select…',''));
                for (const [value, text] of options.choices) input.add(new Option(text,value));
            } else if (options.area) { input = document.createElement('textarea'); input.rows = options.rows || 2; }
            else { input = document.createElement('input'); input.type = 'text'; if (options.numeric) input.inputMode = 'numeric'; }
            input.id = 'kp-' + id; input.name = id; input.required = Boolean(options.required);
            if (options.placeholder) input.placeholder = options.placeholder;
            input.addEventListener('input', () => dirty.add(id)); input.addEventListener('change', () => dirty.add(id));
            fields[id] = input; wrap.append(lab,input); parent.append(wrap); return input;
        }
        function grid(parent, columns = 2) { const el = document.createElement('div'); el.className = columns === 3 ? 'kp-grid3' : 'kp-grid'; parent.append(el); return el; }
        function heading(text, required = false) {
            const el = document.createElement('h3'); el.textContent = text;
            if (required) { const star = document.createElement('span'); star.className = 'kp-required'; star.textContent = ' *'; el.append(star); }
            scroll.append(el);
        }
        function note(parent,text) { const p = document.createElement('p'); p.className = 'kp-note'; p.textContent = text; parent.append(p); }
        function disclosure(text) { const el = document.createElement('details'); const summary = document.createElement('summary'); summary.textContent = text; el.append(summary); scroll.append(el); return el; }
        function check(parent,id,label) { const lab = document.createElement('label'); lab.className = 'kp-check'; const input = document.createElement('input'); input.type='checkbox'; input.id='kp-'+id; fields[id]=input; input.addEventListener('change',()=>dirty.add(id)); lab.append(input,document.createTextNode(label)); parent.append(lab); return input; }
        field(scroll,'public','List on KSU profile page?',{required:true,choices:publicOptions});
        field(scroll,'type','Publication type',{required:true,choices:simplePubTypes});
        const g1=grid(scroll); field(g1,'language','Language',{required:true,choices:simplePubLanguages}); field(g1,'peer','Peer reviewed?',{required:true,choices:simplePeerOptions});
        const g2=grid(scroll); field(g2,'invited','Invited article?',{required:true,choices:simpleInvitedOptions}); field(g2,'location','Publication location',{required:true,choices:simpleLocationOptions});
        field(scroll,'titleEN','Title',{area:true,required:true});
        field(scroll,'journal','Journal title',{required:true});
        field(scroll,'publisher','Publisher');
        const g3=grid(scroll); field(g3,'volume','Volume'); field(g3,'issue','Issue');
        const g4=grid(scroll); field(g4,'start','Start page',{groupRequired:true}); field(g4,'end','End page'); check(scroll,'noPages','No page numbers (e.g. online journal)');
        field(scroll,'totalPages','Total pages',{numeric:true});
        check(scroll,'international','International co-authorship');
        field(scroll,'authorsEN','Authors',{area:true,required:true});
        note(scroll,'Separate names with a comma and a space.');
        // The source form supports first, second and last author positions.
        // Corresponding authorship remains independent in the original form.
        const authorRoles = [
            ['first','First author','BFRSTC'],
            ['second','Second author','BSCNDC'],
            ['last','Last author','BLASTC']
        ];
        function visibleAuthorRows() {
            return all(originalForm,'tr[id^="AUTHOR"]').filter(row =>
                /^AUTHOR\d+$/.test(row.id) && row.getClientRects().length &&
                getComputedStyle(row).visibility !== 'hidden');
        }
        function roleTargets(row) {
            const index=row.id.slice('AUTHOR'.length);
            return authorRoles.map(([id,,prefix])=>{
                const matches=all(row,`input[type="checkbox"][name="${prefix}${index}"]`);
                if(matches.length!==1)throw new Error('Authorship role checkbox not uniquely found: '+prefix+index);
                return [id,matches[0]];
            });
        }
        function authorIdentity(row) {
            return Array.from(row.cells).slice(0,2).map(cell=>normalize(cell.textContent)).join('|');
        }
        const roleSelect=field(scroll,'authorRole','Authorship role',{choices:authorRoles.map(([id,label])=>[id,label])});
        roleSelect.options[0].textContent='Not specified';
        const roleHint=document.createElement('p');roleHint.className='kp-note';roleHint.hidden=true;scroll.append(roleHint);
        let boundAuthor=null;
        let boundIdentity='';
        function reflectRoles(targets){
            const checked=targets.filter(([,el])=>el.checked);
            roleSelect.value=checked.length===1?checked[0][0]:'';
            roleHint.hidden=checked.length<=1;
            roleHint.textContent=checked.length>1?'Multiple positions are selected in the original form. They will be kept unless you choose a position here.':'';
        }
        function initializeRoles(){
            const rows=visibleAuthorRows();
            try {
                if(rows.length!==1)throw new Error('Select authorship roles in the original form when there is not exactly one KSU researcher.');
                const row=rows[0],targets=roleTargets(row);
                if(targets.some(([,el])=>el.disabled))throw new Error('Select authorship roles in the original form.');
                boundAuthor=row;boundIdentity=authorIdentity(row);
                reflectRoles(targets);
            } catch(error){
                boundAuthor=null;roleSelect.disabled=true;
                roleHint.hidden=false;roleHint.textContent=error.message;
            }
        }
        initializeRoles();
        function planAuthorshipRoles(plan){
            if(!dirty.has('authorRole'))return;
            const rows=visibleAuthorRows();
            if(rows.length!==1||rows[0]!==boundAuthor||authorIdentity(rows[0])!==boundIdentity)
                throw new Error('The KSU researcher list has changed. Set authorship roles in the original form.');
            const targets=roleTargets(boundAuthor);
            if(targets.some(([,el])=>el.disabled))throw new Error('An authorship role is unavailable.');
            const wantedRole=roleSelect.value;
            if(wantedRole&&!targets.some(([id])=>id===wantedRole))throw new Error('Unknown authorship role.');
            plan.push(()=>{
                const currentRows=visibleAuthorRows();
                if(currentRows.length!==1||currentRows[0]!==boundAuthor||authorIdentity(boundAuthor)!==boundIdentity)
                    throw new Error('The KSU researcher list has changed. Set authorship roles in the original form.');
                // Uncheck unwanted positions before checking the selected one.
                // Never click the separate corresponding-author checkbox.
                const corresponding=boundAuthor.querySelector(`input[type="checkbox"][name="BCRRSC${boundAuthor.id.slice(6)}"]`);
                const wasCorresponding=corresponding?.checked;
                for(const [id,el] of targets)if(id!==wantedRole)setChecked(el,false);
                for(const [id,el] of targets)if(id===wantedRole)setChecked(el,true);
                if(targets.some(([id,el])=>el.checked!==(id===wantedRole)))
                    throw new Error('The original form did not accept the requested authorship position.');
                if(corresponding&&corresponding.checked!==wasCorresponding)
                    throw new Error('The original form also changed corresponding authorship. Please review that checkbox.');
                reflectRoles(roleTargets(boundAuthor));
                dirty.delete('authorRole');
            });
        }
        heading('Publication date');
        const g5=grid(scroll,3); field(g5,'year','Year',{required:true,numeric:true,placeholder:'YYYY'}); field(g5,'month','Month',{numeric:true,placeholder:'MM'}); field(g5,'day','Day',{numeric:true,placeholder:'DD'});
        const abstract = disclosure('Abstract (optional)'); field(abstract,'abstractJP','Abstract text',{area:true,rows:3});
        const details = disclosure('DOI and other details (optional)');
        field(details,'doi','DOI');
        field(details,'permalink','Link to article');
        note(details,'For articles without a DOI, or for a link to the article on an academic networking platform such as ResearchGate.');
        check(details,'permalinkFree','Free download');
        const val = id => fields[id].value.trim();
        const selected = id => fields[id].checked;
        const wanted = id => val(id) !== '' || dirty.has(id);
        const current = (label,kind,count) => controls(originalForm,label,kind,count);
        function setInitial(id, value) { if (value != null) fields[id].value = value; }
        function tryRead(fn) { try { fn(); } catch(e) { console.warn('KSU publication prefill:', e.message); } }
        function readRadio(id,label,options,order=options.map(x=>x[0])) {
            tryRead(()=>{ const map=radioMap(originalForm,label,order); const chosen=[...map].find(([,r])=>r.checked)?.[0]; if(options.some(([jp])=>jp===chosen))setInitial(id,chosen); });
        }
        readRadio('public','公開区分',publicOptions,publicOrder);
        readRadio('language','言語種別',simplePubLanguages,languageOptions.map(x=>x[0]));
        readRadio('peer','査読の有無',simplePeerOptions,peerOptions.map(x=>x[0]));
        readRadio('invited','招待の有無',simpleInvitedOptions,invitedOptions.map(x=>x[0]));
        readRadio('location','掲載区分',simpleLocationOptions,locationOptions.map(x=>x[0]));
        tryRead(()=>{const s=current('論文種別','selects',1)[0]; const value=simplePubTypes.find(([jp])=>normalize(jp)===normalize(s.selectedOptions[0]?.textContent)); if(value)setInitial('type',value[0]);});
        tryRead(()=>{const x=current('表題','areas',2);setInitial('titleEN',x[1].value.trim()?x[1].value:x[0].value);});
        tryRead(()=>setInitial('journal',current('掲載誌名','texts',4)[0].value));
        tryRead(()=>setInitial('publisher',current('出版社','texts',2)[0].value));
        tryRead(()=>setInitial('totalPages',current('総ページ数','texts',1)[0].value));
        tryRead(()=>{fields.international.checked=current('国際共著','checks',1)[0].checked;});
        const pagesLabel='巻・号・頁';
        tryRead(()=>{const x=current(pagesLabel,'texts',6);for(const [id,i] of [['volume',0],['issue',1],['start',4],['end',5]])setInitial(id,x[i].value);fields.noPages.checked=current(pagesLabel,'checks',1)[0].checked;});
        tryRead(()=>{const x=current('著者・共著者','areas');if(x.length<2)throw new Error('Author textareas missing');setInitial('authorsEN',x[1].value.trim()?x[1].value:x[0].value);});
        tryRead(()=>{const s=current('発行年月日','selects',1)[0];if(normalize(s.selectedOptions[0]?.textContent)==='西暦'){const x=current('発行年月日','texts',3);['year','month','day'].forEach((id,i)=>setInitial(id,x[i].value));}});
        tryRead(()=>{const x=current('概要','areas',2);setInitial('abstractJP',x[0].value);});
        // Avoid searching for collapsed/absent detail controls until necessary.
        tryRead(()=>{if(current('詳細情報','checks',1)[0].checked){for(const [id,,label] of detailFields){tryRead(()=>{setInitial(id,current(label,'texts',1)[0].value);if(fields[id+'Free'])fields[id+'Free'].checked=current(label,'checks',1)[0].checked;});}}});
        if(detailFields.some(([id])=>val(id))||selected('permalinkFree'))details.open=true;
        const syncPages=()=>{fields.start.disabled=fields.end.disabled=selected('noPages');};
        fields.noPages.addEventListener('change',syncPages);syncPages();
        function validate() {
            if(!val('titleEN'))throw new Error('Enter a title.');
            if(!val('authorsEN'))throw new Error('Enter authors.');
            if(!selected('noPages')&&!val('start'))throw new Error('Enter a start page or select No page numbers.');
            if(!/^\d{4}$/.test(val('year'))||Number(val('year'))<1)throw new Error('Enter a four-digit Gregorian year.');
            if(val('month')&&(!/^\d{1,2}$/.test(val('month'))||+val('month')<1||+val('month')>12))throw new Error('Month must be 1–12.');
            if(val('day')&&(!/^\d{1,2}$/.test(val('day'))||!val('month')||+val('day')<1||+val('day')>new Date(+val('year'),+val('month'),0).getDate()))throw new Error('Enter a valid day and month.');
        }
        // Resolve and validate all main targets before writing any main values.
        function buildPlan() {
            const plan=[];
            function put(el,value) { if(!el||!el.isConnected)throw new Error('Target field not found.'); if((el.disabled||el.readOnly)&&el.value!==String(value))throw new Error('A target field is disabled or read-only.'); if(el.value!==String(value))plan.push(()=>setValue(el,value)); }
            function tick(el,value) { if(!el||!el.isConnected||el.disabled)throw new Error('Target checkbox/radio unavailable.'); if(el.checked!==value)plan.push(()=>setChecked(el,value)); }
            function radio(id,label,order) { const map=radioMap(originalForm,label,order); const el=map.get(val(id)); if(!el)throw new Error(label+': selection not found');tick(el,true); }
            function selectText(el,text){const option=optionByText(el,text);if(option.disabled)throw new Error('Dropdown option disabled: '+text);put(el,option.value);}
            radio('public','公開区分',publicOrder); selectText(current('論文種別','selects',1)[0],val('type'));
            radio('language','言語種別',languageOptions.map(x=>x[0]));
            radio('peer','査読の有無',peerOptions.map(x=>x[0]));radio('invited','招待の有無',invitedOptions.map(x=>x[0]));radio('location','掲載区分',locationOptions.map(x=>x[0]));
            // The single field targets the English control. Mirror into the
            // required primary field only when empty or already a copy of English.
            // Preserve separately entered Japanese text in existing records.
            function putEnglishPair(pair,id) {
                const [primary,english]=pair, value=val(id);
                const oldPrimary=primary.value.trim(), oldEnglish=english.value.trim();
                if(!oldPrimary || oldPrimary===oldEnglish) put(primary,value);
                if(dirty.has(id)||oldEnglish||!oldPrimary) put(english,value);
            }
            putEnglishPair(current('表題','areas',2),'titleEN');
            put(current('掲載誌名','texts',4)[0],val('journal'));
            if(wanted('publisher'))put(current('出版社','texts',2)[0],val('publisher'));
            if(wanted('totalPages'))put(current('総ページ数','texts',1)[0],val('totalPages'));
            if(selected('international')||dirty.has('international'))tick(current('国際共著','checks',1)[0],selected('international'));
            const p=current(pagesLabel,'texts',6), no=current(pagesLabel,'checks',1)[0];
            if(wanted('volume')){put(p[0],val('volume'));put(p[2],val('volume'));}if(wanted('issue')){put(p[1],val('issue'));put(p[3],val('issue'));}
            tick(no,selected('noPages'));
            if(!selected('noPages')){plan.push(()=>setValue(p[4],val('start')));if(wanted('end'))plan.push(()=>setValue(p[5],val('end')));}
            const a=current('著者・共著者','areas');if(a.length<2)throw new Error('Author textareas missing');putEnglishPair(a,'authorsEN');
            planAuthorshipRoles(plan);
            selectText(current('発行年月日','selects',1)[0],'西暦');const d=current('発行年月日','texts',3);put(d[0],val('year'));if(wanted('month'))put(d[1],val('month'));if(wanted('day'))put(d[2],val('day'));
            if(wanted('abstractJP'))put(current('概要','areas',2)[0],val('abstractJP'));
            return plan;
        }
        async function fillDetails() {
            const requested=detailFields.filter(([id])=>wanted(id)||(fields[id+'Free']&&(selected(id+'Free')||dirty.has(id+'Free'))));
            if(!requested.length)return;
            const toggle=current('詳細情報','checks',1)[0];setChecked(toggle,true);
            // Allow the existing page handler to reveal the detail rows.
            await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
            const plan=[];
            for(const [id,,label] of requested){
                if(wanted(id)){const el=current(label,'texts',1)[0];if(el.disabled||el.readOnly)throw new Error(label+': field unavailable');plan.push(()=>setValue(el,val(id)));}
                if(fields[id+'Free']&&(selected(id+'Free')||dirty.has(id+'Free'))){const el=current(label,'checks',1)[0];if(el.disabled)throw new Error(label+': download checkbox unavailable');plan.push(()=>setChecked(el,selected(id+'Free')));}
            }
            return plan;
        }
        sideForm.addEventListener('submit',async event=>{
            event.preventDefault();fillButton.disabled=true;status.style.color='#405268';status.textContent='Checking original form…';
            let writesStarted=false;
            try {
                validate();
                const plan=buildPlan();const extra=await fillDetails()||[];
                writesStarted=true;for(const op of [...plan,...extra])op();
                enhancePublicationSubmit();status.style.color='#17613c';status.textContent='Filled original form. Review all values, then click Submit on the original page. Nothing has been saved.';
            } catch(error) {
                console.warn('KSU publication assistant:',error);status.style.color='#ad2929';status.textContent=(writesStarted?'Stopped during autofill; some fields may already have changed. ':'Could not complete the field checks. ')+error.message+' Please review the original form.';
            } finally {fillButton.disabled=false;}
        });
        panel.querySelector('.kp-jump').addEventListener('click',()=>{
            const button=getPublicationSubmit();if(!button){status.textContent='Original Submit button not found.';return;}
            enhancePublicationSubmit();button.scrollIntoView({block:'center',behavior:'smooth'});button.focus({preventScroll:true});
        });
        // Fixed right-hand panel. Reserve space on wide screens; on narrow
        // screens it starts collapsed and opens as an overlay when requested.
        const body=document.body;const originalRight=body.style.paddingRight;const baseRight=parseFloat(getComputedStyle(body).paddingRight)||0;
        const nav=document.getElementById(MENU_ID);const toggle=panel.querySelector('.kp-toggle');
        let collapsed=window.innerWidth<1300;let userToggled=false;
        function layout(){
            if(!userToggled)collapsed=window.innerWidth<1300;
            panel.classList.toggle('kp-collapsed',collapsed);toggle.textContent=collapsed?'Open':'Hide';toggle.setAttribute('aria-expanded',String(!collapsed));
            panel.style.top=(nav?.getBoundingClientRect().bottom||0)+'px';
            body.style.paddingRight=(!collapsed&&window.innerWidth>=1300)?(baseRight+370)+'px':originalRight;
        }
        toggle.addEventListener('click',()=>{userToggled=true;collapsed=!collapsed;layout();});
        body.append(panel);layout();window.addEventListener('resize',layout);if(nav)new ResizeObserver(layout).observe(nav);
    }

    // ============================================================
    // P7231: PRESENTATION ENTRY ASSISTANT
    // ============================================================
    const conferenceOptions = [
        ['国際学会及び海外の学会','International / overseas conference'], ['全国規模の学会','National conference'],
        ['地方会','Regional conference'], ['単独開催シンポジウム','Standalone symposium'], ['研究会','Research meeting'],
        ['定期開催セミナー','Regular seminar'], ['その他(不明含む)','Other / unknown']
    ];
    const formatOptions = [['口頭','Oral'],['ポスター掲示','Poster'],['抄録のみ','Abstract only'],['その他(不明含む)','Other / unknown']];
    const talkOptions = [
        ['特別講演・招待講演など','Special / invited lecture'],
        ['シンポジウム・ワークショップ パネル(公募)','Symposium / workshop / panel (open call)'],
        ['シンポジウム・ワークショップ パネル(指名)','Symposium / workshop / panel (by invitation)'],
        ['シンポジウム・ワークショップ パネル(その他)','Symposium / workshop / panel (other)'],
        ['一般','Regular presentation'],['基調','Keynote'],['その他(不明含む)','Other / unknown']
    ];
    const countryNames = {"アセンション島":"Ascension Island","アンドラ":"Andorra","アラブ首長国連邦":"United Arab Emirates","アフガニスタン":"Afghanistan","アンティグア・バーブーダ":"Antigua & Barbuda","アンギラ":"Anguilla","アルバニア":"Albania","アルメニア":"Armenia","アンゴラ":"Angola","南極":"Antarctica","アルゼンチン":"Argentina","米領サモア":"American Samoa","オーストリア":"Austria","オーストラリア":"Australia","アルバ":"Aruba","オーランド諸島":"Åland Islands","アゼルバイジャン":"Azerbaijan","ボスニア・ヘルツェゴビナ":"Bosnia & Herzegovina","バルバドス":"Barbados","バングラデシュ":"Bangladesh","ベルギー":"Belgium","ブルキナファソ":"Burkina Faso","ブルガリア":"Bulgaria","バーレーン":"Bahrain","ブルンジ":"Burundi","ベナン":"Benin","サン・バルテルミー":"St. Barthélemy","バミューダ":"Bermuda","ブルネイ":"Brunei","ボリビア":"Bolivia","オランダ領カリブ":"Caribbean Netherlands","ブラジル":"Brazil","バハマ":"Bahamas","ブータン":"Bhutan","ブーベ島":"Bouvet Island","ボツワナ":"Botswana","ベラルーシ":"Belarus","ベリーズ":"Belize","カナダ":"Canada","ココス(キーリング)諸島":"Cocos (Keeling) Islands","コンゴ民主共和国(キンシャサ)":"Congo - Kinshasa","中央アフリカ共和国":"Central African Republic","コンゴ共和国(ブラザビル)":"Congo - Brazzaville","スイス":"Switzerland","コートジボワール":"Côte d’Ivoire","クック諸島":"Cook Islands","チリ":"Chile","カメルーン":"Cameroon","中国":"China","コロンビア":"Colombia","クリッパートン島":"Clipperton Island","コスタリカ":"Costa Rica","キューバ":"Cuba","カーボベルデ":"Cape Verde","キュラソー":"Curaçao","クリスマス島":"Christmas Island","キプロス":"Cyprus","チェコ":"Czechia","ドイツ":"Germany","ディエゴガルシア島":"Diego Garcia","ジブチ":"Djibouti","デンマーク":"Denmark","ドミニカ国":"Dominica","ドミニカ共和国":"Dominican Republic","アルジェリア":"Algeria","セウタ・メリリャ":"Ceuta & Melilla","エクアドル":"Ecuador","エストニア":"Estonia","エジプト":"Egypt","西サハラ":"Western Sahara","エリトリア":"Eritrea","スペイン":"Spain","エチオピア":"Ethiopia","欧州連合":"European Union","ユーロ圏":"Eurozone","フィンランド":"Finland","フィジー":"Fiji","フォークランド諸島":"Falkland Islands","ミクロネシア連邦":"Micronesia","フェロー諸島":"Faroe Islands","フランス":"France","ガボン":"Gabon","イギリス":"United Kingdom","グレナダ":"Grenada","ジョージア":"Georgia","仏領ギアナ":"French Guiana","ガーンジー":"Guernsey","ガーナ":"Ghana","ジブラルタル":"Gibraltar","グリーンランド":"Greenland","ガンビア":"Gambia","ギニア":"Guinea","グアドループ":"Guadeloupe","赤道ギニア":"Equatorial Guinea","ギリシャ":"Greece","サウスジョージア・サウスサンドウィッチ諸島":"South Georgia & South Sandwich Islands","グアテマラ":"Guatemala","グアム":"Guam","ギニアビサウ":"Guinea-Bissau","ガイアナ":"Guyana","中華人民共和国香港特別行政区":"Hong Kong SAR China","ハード島・マクドナルド諸島":"Heard & McDonald Islands","ホンジュラス":"Honduras","クロアチア":"Croatia","ハイチ":"Haiti","ハンガリー":"Hungary","カナリア諸島":"Canary Islands","インドネシア":"Indonesia","アイルランド":"Ireland","イスラエル":"Israel","マン島":"Isle of Man","インド":"India","英領インド洋地域":"British Indian Ocean Territory","イラク":"Iraq","イラン":"Iran","アイスランド":"Iceland","イタリア":"Italy","ジャージー":"Jersey","ジャマイカ":"Jamaica","ヨルダン":"Jordan","日本":"Japan","ケニア":"Kenya","キルギス":"Kyrgyzstan","カンボジア":"Cambodia","キリバス":"Kiribati","コモロ":"Comoros","セントクリストファー・ネーヴィス":"St. Kitts & Nevis","北朝鮮":"North Korea","韓国":"South Korea","クウェート":"Kuwait","ケイマン諸島":"Cayman Islands","カザフスタン":"Kazakhstan","ラオス":"Laos","レバノン":"Lebanon","セントルシア":"St. Lucia","リヒテンシュタイン":"Liechtenstein","スリランカ":"Sri Lanka","リベリア":"Liberia","レソト":"Lesotho","リトアニア":"Lithuania","ルクセンブルク":"Luxembourg","ラトビア":"Latvia","リビア":"Libya","モロッコ":"Morocco","モナコ":"Monaco","モルドバ":"Moldova","モンテネグロ":"Montenegro","サン・マルタン":"St. Martin","マダガスカル":"Madagascar","マーシャル諸島":"Marshall Islands","北マケドニア":"North Macedonia","マリ":"Mali","ミャンマー (ビルマ)":"Myanmar (Burma)","モンゴル":"Mongolia","中華人民共和国マカオ特別行政区":"Macao SAR China","北マリアナ諸島":"Northern Mariana Islands","マルティニーク":"Martinique","モーリタニア":"Mauritania","モントセラト":"Montserrat","マルタ":"Malta","モーリシャス":"Mauritius","モルディブ":"Maldives","マラウイ":"Malawi","メキシコ":"Mexico","マレーシア":"Malaysia","モザンビーク":"Mozambique","ナミビア":"Namibia","ニューカレドニア":"New Caledonia","ニジェール":"Niger","ノーフォーク島":"Norfolk Island","ナイジェリア":"Nigeria","ニカラグア":"Nicaragua","オランダ":"Netherlands","ノルウェー":"Norway","ネパール":"Nepal","ナウル":"Nauru","ニウエ":"Niue","ニュージーランド":"New Zealand","オマーン":"Oman","パナマ":"Panama","ペルー":"Peru","仏領ポリネシア":"French Polynesia","パプアニューギニア":"Papua New Guinea","フィリピン":"Philippines","パキスタン":"Pakistan","ポーランド":"Poland","サンピエール島・ミクロン島":"St. Pierre & Miquelon","ピトケアン諸島":"Pitcairn Islands","プエルトリコ":"Puerto Rico","パレスチナ自治区":"Palestinian Territories","ポルトガル":"Portugal","パラオ":"Palau","パラグアイ":"Paraguay","カタール":"Qatar","オセアニア周辺地域":"Outlying Oceania","レユニオン":"Réunion","ルーマニア":"Romania","セルビア":"Serbia","ロシア":"Russia","ルワンダ":"Rwanda","サウジアラビア":"Saudi Arabia","ソロモン諸島":"Solomon Islands","セーシェル":"Seychelles","スーダン":"Sudan","スウェーデン":"Sweden","シンガポール":"Singapore","セントヘレナ":"St. Helena","スロベニア":"Slovenia","スバールバル諸島・ヤンマイエン島":"Svalbard & Jan Mayen","スロバキア":"Slovakia","シエラレオネ":"Sierra Leone","サンマリノ":"San Marino","セネガル":"Senegal","ソマリア":"Somalia","スリナム":"Suriname","南スーダン":"South Sudan","サントメ・プリンシペ":"São Tomé & Príncipe","エルサルバドル":"El Salvador","シント・マールテン":"Sint Maarten","シリア":"Syria","エスワティニ":"Eswatini","トリスタン・ダ・クーニャ":"Tristan da Cunha","タークス・カイコス諸島":"Turks & Caicos Islands","チャド":"Chad","仏領極南諸島":"French Southern Territories","トーゴ":"Togo","タイ":"Thailand","タジキスタン":"Tajikistan","トケラウ":"Tokelau","東ティモール":"Timor-Leste","トルクメニスタン":"Turkmenistan","チュニジア":"Tunisia","トンガ":"Tonga","トルコ":"Türkiye","トリニダード・トバゴ":"Trinidad & Tobago","ツバル":"Tuvalu","台湾":"Taiwan","タンザニア":"Tanzania","ウクライナ":"Ukraine","ウガンダ":"Uganda","合衆国領有小離島":"U.S. Outlying Islands","国際連合":"United Nations","アメリカ合衆国":"United States","ウルグアイ":"Uruguay","ウズベキスタン":"Uzbekistan","バチカン市国":"Vatican City","セントビンセント及びグレナディーン諸島":"St. Vincent & Grenadines","ベネズエラ":"Venezuela","英領ヴァージン諸島":"British Virgin Islands","米領ヴァージン諸島":"U.S. Virgin Islands","ベトナム":"Vietnam","バヌアツ":"Vanuatu","ウォリス・フツナ":"Wallis & Futuna","サモア":"Samoa","疑似アクセント":"Pseudo-Accents","疑似 BIDI":"Pseudo-Bidi","コソボ":"Kosovo","イエメン":"Yemen","マヨット":"Mayotte","南アフリカ":"South Africa","ザンビア":"Zambia","ジンバブエ":"Zimbabwe","不明な地域":"Unknown Region","米国":"United States","英国":"United Kingdom","大韓民国":"South Korea","中華人民共和国":"China","香港":"Hong Kong","ロシア連邦":"Russia","フィリピン共和国":"Philippines","日本国":"Japan","その他":"Other","不明":"Unknown"};
    // English display names keyed by the original ISO alpha-3 country values.
    const countryNamesByCode = {"ABW": "Aruba", "AFG": "Afghanistan", "AGO": "Angola", "AIA": "Anguilla", "ALA": "Åland Islands", "ALB": "Albania", "AND": "Andorra", "ARE": "United Arab Emirates", "ARG": "Argentina", "ARM": "Armenia", "ASM": "American Samoa", "ATA": "Antarctica", "ATF": "French Southern Territories", "ATG": "Antigua & Barbuda", "AUS": "Australia", "AUT": "Austria", "AZE": "Azerbaijan", "BDI": "Burundi", "BEL": "Belgium", "BEN": "Benin", "BES": "Caribbean Netherlands", "BFA": "Burkina Faso", "BGD": "Bangladesh", "BGR": "Bulgaria", "BHR": "Bahrain", "BHS": "Bahamas", "BIH": "Bosnia & Herzegovina", "BLM": "St. Barthélemy", "BLR": "Belarus", "BLZ": "Belize", "BMU": "Bermuda", "BOL": "Bolivia", "BRA": "Brazil", "BRB": "Barbados", "BRN": "Brunei", "BTN": "Bhutan", "BVT": "Bouvet Island", "BWA": "Botswana", "CAF": "Central African Republic", "CAN": "Canada", "CCK": "Cocos (Keeling) Islands", "CHE": "Switzerland", "CHL": "Chile", "CHN": "China", "CIV": "Côte d’Ivoire", "CMR": "Cameroon", "COD": "Congo - Kinshasa", "COG": "Congo - Brazzaville", "COK": "Cook Islands", "COL": "Colombia", "COM": "Comoros", "CPV": "Cape Verde", "CRI": "Costa Rica", "CUB": "Cuba", "CUW": "Curaçao", "CXR": "Christmas Island", "CYM": "Cayman Islands", "CYP": "Cyprus", "CZE": "Czechia", "DEU": "Germany", "DJI": "Djibouti", "DMA": "Dominica", "DNK": "Denmark", "DOM": "Dominican Republic", "DZA": "Algeria", "ECU": "Ecuador", "EGY": "Egypt", "ERI": "Eritrea", "ESH": "Western Sahara", "ESP": "Spain", "EST": "Estonia", "ETH": "Ethiopia", "FIN": "Finland", "FJI": "Fiji", "FLK": "Falkland Islands", "FRA": "France", "FRO": "Faroe Islands", "FSM": "Micronesia", "GAB": "Gabon", "GBR": "United Kingdom", "GEO": "Georgia", "GGY": "Guernsey", "GHA": "Ghana", "GIB": "Gibraltar", "GIN": "Guinea", "GLP": "Guadeloupe", "GMB": "Gambia", "GNB": "Guinea-Bissau", "GNQ": "Equatorial Guinea", "GRC": "Greece", "GRD": "Grenada", "GRL": "Greenland", "GTM": "Guatemala", "GUF": "French Guiana", "GUM": "Guam", "GUY": "Guyana", "HKG": "Hong Kong", "HMD": "Heard & McDonald Islands", "HND": "Honduras", "HRV": "Croatia", "HTI": "Haiti", "HUN": "Hungary", "IDN": "Indonesia", "IMN": "Isle of Man", "IND": "India", "IOT": "British Indian Ocean Territory", "IRL": "Ireland", "IRN": "Iran", "IRQ": "Iraq", "ISL": "Iceland", "ISR": "Israel", "ITA": "Italy", "JAM": "Jamaica", "JEY": "Jersey", "JOR": "Jordan", "JPN": "Japan", "KAZ": "Kazakhstan", "KEN": "Kenya", "KGZ": "Kyrgyzstan", "KHM": "Cambodia", "KIR": "Kiribati", "KNA": "St. Kitts & Nevis", "KOR": "South Korea", "KWT": "Kuwait", "LAO": "Laos", "LBN": "Lebanon", "LBR": "Liberia", "LBY": "Libya", "LCA": "St. Lucia", "LIE": "Liechtenstein", "LKA": "Sri Lanka", "LSO": "Lesotho", "LTU": "Lithuania", "LUX": "Luxembourg", "LVA": "Latvia", "MAC": "Macao", "MAF": "St. Martin", "MAR": "Morocco", "MCO": "Monaco", "MDA": "Moldova", "MDG": "Madagascar", "MDV": "Maldives", "MEX": "Mexico", "MHL": "Marshall Islands", "MKD": "North Macedonia", "MLI": "Mali", "MLT": "Malta", "MMR": "Myanmar (Burma)", "MNE": "Montenegro", "MNG": "Mongolia", "MNP": "Northern Mariana Islands", "MOZ": "Mozambique", "MRT": "Mauritania", "MSR": "Montserrat", "MTQ": "Martinique", "MUS": "Mauritius", "MWI": "Malawi", "MYS": "Malaysia", "MYT": "Mayotte", "NAM": "Namibia", "NCL": "New Caledonia", "NER": "Niger", "NFK": "Norfolk Island", "NGA": "Nigeria", "NIC": "Nicaragua", "NIU": "Niue", "NLD": "Netherlands", "NOR": "Norway", "NPL": "Nepal", "NRU": "Nauru", "NZL": "New Zealand", "OMN": "Oman", "PAK": "Pakistan", "PAN": "Panama", "PCN": "Pitcairn Islands", "PER": "Peru", "PHL": "Philippines", "PLW": "Palau", "PNG": "Papua New Guinea", "POL": "Poland", "PRI": "Puerto Rico", "PRK": "North Korea", "PRT": "Portugal", "PRY": "Paraguay", "PSE": "Palestine", "PYF": "French Polynesia", "QAT": "Qatar", "REU": "Réunion", "ROU": "Romania", "RUS": "Russia", "RWA": "Rwanda", "SAU": "Saudi Arabia", "SDN": "Sudan", "SEN": "Senegal", "SGP": "Singapore", "SGS": "South Georgia & South Sandwich Islands", "SHN": "St. Helena", "SJM": "Svalbard & Jan Mayen", "SLB": "Solomon Islands", "SLE": "Sierra Leone", "SLV": "El Salvador", "SMR": "San Marino", "SOM": "Somalia", "SPM": "St. Pierre & Miquelon", "SRB": "Serbia", "SSD": "South Sudan", "STP": "São Tomé & Príncipe", "SUR": "Suriname", "SVK": "Slovakia", "SVN": "Slovenia", "SWE": "Sweden", "SWZ": "Eswatini", "SXM": "Sint Maarten", "SYC": "Seychelles", "SYR": "Syria", "TCA": "Turks & Caicos Islands", "TCD": "Chad", "TGO": "Togo", "THA": "Thailand", "TJK": "Tajikistan", "TKL": "Tokelau", "TKM": "Turkmenistan", "TLS": "Timor-Leste", "TON": "Tonga", "TTO": "Trinidad & Tobago", "TUN": "Tunisia", "TUR": "Türkiye", "TUV": "Tuvalu", "TWN": "Taiwan", "TZA": "Tanzania", "UGA": "Uganda", "UKR": "Ukraine", "UMI": "U.S. Outlying Islands", "URY": "Uruguay", "USA": "United States", "UZB": "Uzbekistan", "VAT": "Vatican City", "VCT": "St. Vincent & Grenadines", "VEN": "Venezuela", "VGB": "British Virgin Islands", "VIR": "U.S. Virgin Islands", "VNM": "Vietnam", "VUT": "Vanuatu", "WLF": "Wallis & Futuna", "WSM": "Samoa", "XKX": "Kosovo", "YEM": "Yemen", "ZAF": "South Africa", "ZMB": "Zambia", "ZWE": "Zimbabwe"};
    function createPresentationPanel() {
        if (document.getElementById(PANEL_ID)) return;
        const originalForm = getPublicationForm();
        if (!originalForm) { console.warn('KSU presentation assistant: entry form not uniquely identified.'); return; }
        installPanelStyles(); enhancePublicationSubmit();
        const panel = document.createElement('aside'); panel.id = PANEL_ID;
        panel.setAttribute('aria-label','Presentation entry assistant');
        panel.innerHTML = `<div class="kp-head"><strong>Presentation entry</strong><button type="button" class="kp-toggle" aria-expanded="true">Hide</button></div>
          <form autocomplete="off"><div class="kp-scroll"><p class="kp-note">Enter details here, then click "Autofill form". Click "Submit" when complete.</p></div>
          <div class="kp-footer"><div class="kp-status" role="status" aria-live="polite">Ready to enter presentation details.</div><div class="kp-actions"><button type="submit">Autofill form</button><button type="button" class="kp-jump">Go to Submit</button></div></div></form>`;
        const sideForm = panel.querySelector('form'); const scroll = panel.querySelector('.kp-scroll');
        const status = panel.querySelector('.kp-status'); const fillButton = sideForm.querySelector('button[type=submit]');
        const fields = {}; const dirty = new Set();
        function field(parent, id, label, options = {}) {
            const wrap = document.createElement('div'); wrap.className = 'kp-field';
            const lab = document.createElement('label'); lab.htmlFor = 'kp-' + id; lab.textContent = label;
            if (options.required || options.groupRequired) { const star = document.createElement('span'); star.className = 'kp-required'; star.textContent = ' *'; lab.append(star); }
            let input;
            if (options.choices) {
                input = document.createElement('select'); input.add(new Option('Select…',''));
                for (const [value, text] of options.choices) input.add(new Option(text,value));
            } else if (options.area) { input = document.createElement('textarea'); input.rows = options.rows || 2; }
            else { input = document.createElement('input'); input.type = 'text'; if (options.numeric) input.inputMode = 'numeric'; }
            input.id = 'kp-' + id; input.name = id; input.required = Boolean(options.required);
            if (options.placeholder) input.placeholder = options.placeholder;
            input.addEventListener('input', () => dirty.add(id)); input.addEventListener('change', () => dirty.add(id));
            fields[id] = input; wrap.append(lab,input); parent.append(wrap); return input;
        }
        function grid(parent, columns = 2) { const el = document.createElement('div'); el.className = columns === 3 ? 'kp-grid3' : 'kp-grid'; parent.append(el); return el; }
        function heading(text, required = false) {
            const el = document.createElement('h3'); el.textContent = text;
            if (required) { const star = document.createElement('span'); star.className = 'kp-required'; star.textContent = ' *'; el.append(star); }
            scroll.append(el);
        }
        function note(parent,text) { const p = document.createElement('p'); p.className = 'kp-note'; p.textContent = text; parent.append(p); }
        function disclosure(text) { const el = document.createElement('details'); const summary = document.createElement('summary'); summary.textContent = text; el.append(summary); scroll.append(el); return el; }
        function check(parent,id,label) { const lab = document.createElement('label'); lab.className = 'kp-check'; const input = document.createElement('input'); input.type='checkbox'; input.id='kp-'+id; fields[id]=input; input.addEventListener('change',()=>dirty.add(id)); lab.append(input,document.createTextNode(label)); parent.append(lab); return input; }
        const current = (label,kind,count) => controls(originalForm,label,kind,count);
        const val = id => fields[id].value.trim();
        const wanted = id => val(id) !== '' || dirty.has(id);
        const selected = id => fields[id].checked;
        const setInitial = (id,value) => { if(value!=null) fields[id].value=value; };
        function tryRead(fn) { try { fn(); } catch(e) { console.warn('KSU presentation prefill:',e.message); } }
        const radioFields = [
            ['public','公開区分',publicOptions,publicOrder], ['language','発表言語',simplePubLanguages,languageOptions.map(x=>x[0])],
            ['conferenceType','学会区分',conferenceOptions], ['format','発表形式',formatOptions], ['talkType','講演区分',talkOptions]
        ];
        field(scroll,'public','List on KSU profile page?',{required:true,choices:publicOptions});
        field(scroll,'language','Presentation language',{required:true,choices:simplePubLanguages});
        field(scroll,'titleEN','Title',{area:true,required:true});
        field(scroll,'meetingEN','Conference name',{required:true});
        field(scroll,'conferenceType','Conference type',{required:true,choices:conferenceOptions});
        check(scroll,'invited','Invited presentation');
        field(scroll,'format','Presentation format',{required:true,choices:formatOptions});
        field(scroll,'talkType','Talk type',{required:true,choices:[...talkOptions.filter(([jp])=>jp==='一般'),...talkOptions.filter(([jp])=>jp!=='一般')]});
        field(scroll,'presentersEN','Presenters',{area:true,required:true});
        note(scroll,'Separate names with a comma and a space.');
        function dateFields(parent,prefix,required=false){const g=grid(parent,3);field(g,prefix+'Year','Year',{required,numeric:true,placeholder:'YYYY'});field(g,prefix+'Month','Month',{numeric:true,placeholder:'MM'});field(g,prefix+'Day','Day',{numeric:true,placeholder:'DD'});}
        heading('Presentation date');
        dateFields(scroll,'date',true);
        heading('Location');
        // SCNTRY is the visible country control. SCNTRY_hidden is a separate
        // control used by the website; never translate or write to it directly.
        function getCountrySelect() {
            const matches = all(originalForm, 'select[name="SCNTRY"]');
            if (matches.length !== 1) throw new Error('Country dropdown SCNTRY not uniquely found.');
            return matches[0];
        }
        // Mirror only the actual available options. Use their stable values,
        // not option positions or Japanese spelling, and sort in English.
        let countryChoices=[];
        tryRead(()=>{
            const s=getCountrySelect();
            countryChoices=Array.from(s.options)
                .filter(o=>!o.disabled&&o.value!=='')
                .map(o=>{
                    const jp=(o.label||o.textContent).trim();
                    const english=countryNamesByCode[o.value.trim().toUpperCase()]||countryNames[jp]||jp||o.value;
                    return [o.value,english];
                })
                .sort((a,b)=>Number(b[0].trim().toUpperCase()==='JPN')-Number(a[0].trim().toUpperCase()==='JPN') || a[1].localeCompare(b[1],'en'));
        });
        field(scroll,'country','Country',{choices:countryChoices});
        if(!countryChoices.length){fields.country.disabled=true;note(scroll,'Country options could not be read. Select a country in the original form if needed.');}
        field(scroll,'venueEN','Venue / location',{required:true});
        const period=disclosure('Conference dates (optional)');
        note(period,'Start date');dateFields(period,'start');note(period,'End date');dateFields(period,'end');
        check(scroll,'international','International co-authorship');
        const abstract=disclosure('Abstract (optional)');field(abstract,'abstractEN','Abstract text',{area:true,rows:3});
        field(scroll,'external','External URL');
        for(const [id,label,options,order=options.map(x=>x[0])] of radioFields){tryRead(()=>{const chosen=[...radioMap(originalForm,label,order)].find(([,r])=>r.checked)?.[0];if(options.some(([jp])=>jp===chosen))setInitial(id,chosen);});}
        const pairs=[['titleEN','発表タイトル','areas',true],['meetingEN','会議名','texts',true],['presentersEN','発表者・共同発表者','areas',true],['venueEN','開催地','texts',true],['abstractEN','概要','areas',false]];
        function pairControls(label,kind){const x=current(label,kind);if(x.length<2 || (label!=='発表者・共同発表者'&&x.length!==2))throw new Error(label+': unexpected number of fields');return x;}
        for(const [id,label,kind] of pairs)tryRead(()=>{const x=pairControls(label,kind);setInitial(id,x[1].value.trim()?x[1].value:x[0].value);});
        for(const [id,label] of [['invited','招聘'],['international','国際共著']])tryRead(()=>{fields[id].checked=current(label,'checks',1)[0].checked;});
        tryRead(()=>{const s=getCountrySelect();if(countryChoices.some(([id])=>id===s.value))setInitial('country',s.value);});
        tryRead(()=>setInitial('external',current('外部リンクURL','texts',1)[0].value));
        function readDate(label,prefix,index,count){const ss=current(label,'selects',count),x=current(label,'texts',count*3);if(normalize(ss[index].selectedOptions[0]?.textContent)==='西暦')['Year','Month','Day'].forEach((suffix,i)=>setInitial(prefix+suffix,x[index*3+i].value));}
        tryRead(()=>readDate('発表年月日','date',0,1));tryRead(()=>readDate('開催期間','start',0,2));tryRead(()=>readDate('開催期間','end',1,2));
        if(['start','end'].some(p=>['Year','Month','Day'].some(s=>val(p+s))))period.open=true;
        if(val('abstractEN'))abstract.open=true;
        function validateDate(prefix,required){const y=val(prefix+'Year'),m=val(prefix+'Month'),d=val(prefix+'Day');if(!required&&!y&&!m&&!d)return;if(!/^\d{4}$/.test(y)||+y<1)throw new Error('Enter a four-digit Gregorian year for '+prefix+' date.');if(m&&(!/^\d{1,2}$/.test(m)||+m<1||+m>12))throw new Error('Month must be 1–12.');if(d&&(!/^\d{1,2}$/.test(d)||!m||+d<1||+d>new Date(+y,+m,0).getDate()))throw new Error('Enter a valid day and month.');}
        function validate(){for(const [id,label,,required] of pairs)if(required&&!val(id))throw new Error('Enter '+({発表タイトル:'a title',会議名:'a conference name','発表者・共同発表者':'presenter names',開催地:'a venue or location'}[label])+'.');validateDate('date',true);validateDate('start',false);validateDate('end',false);}
        function buildPlan(){
            const plan=[];
            function put(el,value,mayEnable=false){if(!el||!el.isConnected)throw new Error('Target field not found.');if(!mayEnable&&(el.disabled||el.readOnly)&&el.value!==String(value))throw new Error('Target field is disabled or read-only.');if(el.value!==String(value))plan.push(()=>setValue(el,value));}
            function tick(el,value){if(!el||!el.isConnected||el.disabled)throw new Error('Target option unavailable.');if(el.checked!==value)plan.push(()=>setChecked(el,value));}
            function selectText(el,text){const option=optionByText(el,text);if(option.disabled)throw new Error('Dropdown option disabled: '+text);put(el,option.value);}
            for(const [id,label,options,order=options.map(x=>x[0])] of radioFields){const el=radioMap(originalForm,label,order).get(val(id));if(!el)throw new Error(label+': selection not found');tick(el,true);}
            // Match the publication assistant: use the English field, mirror into
            // the primary field when empty or previously a copy, and preserve
            // independently entered primary-language text in existing records.
            for(const [id,label,kind,required] of pairs){
                if(!required&&!wanted(id))continue;
                const [primary,english]=pairControls(label,kind), value=val(id);
                const oldPrimary=primary.value.trim(), oldEnglish=english.value.trim();
                if(!oldPrimary || oldPrimary===oldEnglish)put(primary,value);
                if(dirty.has(id)||oldEnglish||!oldPrimary)put(english,value);
            }
            for(const [id,label] of [['invited','招聘'],['international','国際共著']])if(selected(id)||dirty.has(id))tick(current(label,'checks',1)[0],selected(id));
            if(wanted('country')&&!fields.country.disabled){const s=getCountrySelect();const option=Array.from(s.options).find(o=>!o.disabled&&o.value===fields.country.value);if(!option)throw new Error('Country option unavailable.');put(s,option.value);}
            function putDate(label,prefix,index,count,required){const suffixes=['Year','Month','Day'];if(!required&&!suffixes.some(s=>wanted(prefix+s)))return;const ss=current(label,'selects',count),x=current(label,'texts',count*3);if(val(prefix+'Year'))selectText(ss[index],'西暦');suffixes.forEach((suffix,i)=>{if((required&&i===0)||wanted(prefix+suffix))put(x[index*3+i],val(prefix+suffix));});}
            putDate('発表年月日','date',0,1,true);putDate('開催期間','start',0,2,false);putDate('開催期間','end',1,2,false);
            if(wanted('external'))put(current('外部リンクURL','texts',1)[0],val('external'));
            return plan;
        }
        sideForm.addEventListener('submit',event=>{event.preventDefault();fillButton.disabled=true;status.style.color='#405268';status.textContent='Checking original form…';let writesStarted=false;try{validate();const plan=buildPlan();writesStarted=true;for(const op of plan)op();enhancePublicationSubmit();status.style.color='#17613c';status.textContent='Filled original form. Review all values, then click Submit on the original page. Nothing has been saved.';}catch(error){console.warn('KSU presentation assistant:',error);status.style.color='#ad2929';status.textContent=(writesStarted?'Stopped during autofill; some fields may already have changed. ':'Could not complete the field checks. ')+error.message+' Please review the original form.';}finally{fillButton.disabled=false;}});
        panel.querySelector('.kp-jump').addEventListener('click',()=>{const button=getPublicationSubmit();if(!button){status.textContent='Original Submit button not found.';return;}enhancePublicationSubmit();button.scrollIntoView({block:'center',behavior:'smooth'});button.focus({preventScroll:true});});
        // Fixed right-hand panel. Reserve space on wide screens; on narrow
        // screens it starts collapsed and opens as an overlay when requested.
        const body=document.body;const originalRight=body.style.paddingRight;const baseRight=parseFloat(getComputedStyle(body).paddingRight)||0;
        const nav=document.getElementById(MENU_ID);const toggle=panel.querySelector('.kp-toggle');
        let collapsed=window.innerWidth<1300;let userToggled=false;
        function layout(){
            if(!userToggled)collapsed=window.innerWidth<1300;
            panel.classList.toggle('kp-collapsed',collapsed);toggle.textContent=collapsed?'Open':'Hide';toggle.setAttribute('aria-expanded',String(!collapsed));
            panel.style.top=(nav?.getBoundingClientRect().bottom||0)+'px';
            body.style.paddingRight=(!collapsed&&window.innerWidth>=1300)?(baseRight+370)+'px':originalRight;
        }
        toggle.addEventListener('click',()=>{userToggled=true;collapsed=!collapsed;layout();});
        body.append(panel);layout();window.addEventListener('resize',layout);if(nav)new ResizeObserver(layout).observe(nav);
    }

    // Initialize existing navigation and page-wide button enhancements.
    createNavigation(); installActionButtonStyles(); enhanceActionButtons(); monitorActionButtons();
    if (hasYearFilter) enhancePublicationYearFilter();
    if (page === 'P7211') createPublicationPanel();
    if (isPresentation) createPresentationPanel();
})();
