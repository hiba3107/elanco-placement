/*
 * Nexvia Group: page behaviour.
 *
 * Builds the menus, service explorer, training programs, value sheet and search from
 * NEXVIA_CONTENT (js/content.js), and runs the header, the hero video and the contact form.
 * Plain JavaScript, no libraries and no build step.
 */
(function (window) {
  "use strict";

  const document = window.document;
  const navigator = window.navigator;
  const content = window.NEXVIA_CONTENT;

  const SVG_NS = "http://www.w3.org/2000/svg";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const wideScreen = window.matchMedia("(min-width: 1000px)");
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)");

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  /* ---------- Helpers ---------- */

  /* Small DOM builder: el("a", { class: "card", href: "#x" }, "Text", childNode). */
  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(attrs || {})) {
      if (value === false || value === null || value === undefined) continue;
      if (name === "class") node.className = value;
      else if (name === "hidden") node.hidden = true;
      else node.setAttribute(name, value === true ? "" : String(value));
    }
    for (const child of children.flat(Infinity)) {
      if (child !== null && child !== undefined && child !== false) node.append(child);
    }
    return node;
  }

  /* An icon from the sprite in index.html. */
  function icon(name, extraClass) {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", extraClass ? `icon ${extraClass}` : "icon");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const use = document.createElementNS(SVG_NS, "use");
    use.setAttribute("href", `#i-${name}`);
    svg.append(use);
    return svg;
  }

  function scrollToTarget(target) {
    if (!target) return;
    target.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "start" });
  }

  /* Copies text. If the clipboard is not available it selects the text so the visitor can copy it. */
  function copyText(text, fallbackNode) {
    const selectFallback = () => {
      if (!fallbackNode) return;
      const range = document.createRange();
      range.selectNodeContents(fallbackNode);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    };
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      selectFallback();
      return Promise.resolve(false);
    }
    return navigator.clipboard.writeText(text).then(
      () => true,
      () => {
        selectFallback();
        return false;
      },
    );
  }

  /*
   * Tabs with the usual keyboard support: arrow keys move between tabs, Home and End jump
   * to the first and last. `panels` is optional; when given, only the chosen one is shown.
   */
  function createTabs({ tablist, tabs, panels, isVertical, onChange }) {
    let current = -1;

    function select(index, { focus = false } = {}) {
      const next = (index + tabs.length) % tabs.length;
      tabs.forEach((tab, i) => {
        const on = i === next;
        tab.classList.toggle("is-active", on);
        tab.setAttribute("aria-selected", String(on));
        tab.tabIndex = on ? 0 : -1;
        if (panels) panels[i].hidden = !on;
      });
      const changed = next !== current;
      current = next;
      if (focus) tabs[next].focus();
      if (changed && onChange) onChange(next);
    }

    tablist.addEventListener("click", (event) => {
      const tab = event.target.closest('[role="tab"]');
      if (tab && tablist.contains(tab)) select(tabs.indexOf(tab));
    });

    tablist.addEventListener("keydown", (event) => {
      const vertical = isVertical ? isVertical() : false;
      const moves = {
        [vertical ? "ArrowDown" : "ArrowRight"]: current + 1,
        [vertical ? "ArrowUp" : "ArrowLeft"]: current - 1,
        Home: 0,
        End: tabs.length - 1,
      };
      if (!(event.key in moves)) return;
      event.preventDefault();
      select(moves[event.key], { focus: true });
    });

    return {
      select,
      get index() {
        return current;
      },
    };
  }

  const serviceName = (service) => service.short || service.title;

  /* ---------- Services ---------- */

  let serviceTabs = null;

  function buildDisciplines() {
    const grid = $("#discipline-grid");
    if (!grid) return;
    content.disciplines.forEach((item) => {
      grid.append(
        el(
          "a",
          {
            class: "card",
            href: `#${item.service || item.section}`,
            "data-service": item.service,
            "data-reveal": true,
          },
          icon(item.icon, "card__icon"),
          el("h3", { class: "card__title" }, item.title),
          el("p", { class: "card__text" }, item.text),
          el(
            "span",
            { class: "card__more" },
            item.service ? "View scope" : "View programs",
            icon("arrow-right", "icon--sm"),
          ),
        ),
      );
    });
  }

  /* The FAT workflow as a table: one row per vendor stage, with what each party does. */
  function buildFlow(flow) {
    /*
     * On small screens the stylesheet stacks each row, with data-label naming the party.
     * The explicit roles keep it a table for screen readers when that happens.
     */
    const rows = flow.steps.map(([stage, client, nexvia], i) =>
      el(
        "tr",
        { role: "row" },
        el(
          "th",
          { scope: "row", role: "rowheader" },
          el("span", { class: "flow__num" }, String(i + 1)),
          stage,
        ),
        el("td", { role: "cell", "data-label": flow.columns[1] }, client),
        el("td", { role: "cell", "data-label": flow.columns[2] }, nexvia),
      ),
    );
    return el(
      "table",
      { class: "flow", role: "table" },
      el("caption", null, flow.caption),
      el(
        "thead",
        { role: "rowgroup" },
        el(
          "tr",
          { role: "row" },
          flow.columns.map((name) => el("th", { scope: "col", role: "columnheader" }, name)),
        ),
      ),
      el("tbody", { role: "rowgroup" }, rows),
    );
  }

  function buildServicePanel(service) {
    const media = service.image
      ? el(
          "figure",
          { class: "svc__media" },
          el("img", {
            src: service.image.src,
            alt: service.image.alt,
            width: service.image.width,
            height: service.image.height,
            loading: "lazy",
          }),
        )
      : null;

    const head = el(
      "div",
      { class: media ? "svc__head svc__head--media" : "svc__head" },
      el(
        "div",
        { class: "svc__intro" },
        el("p", { class: "tag" }, service.tag),
        el("h4", { class: "svc__title" }, service.title),
        el("p", { class: "svc__summary" }, service.summary),
        el(
          "a",
          {
            class: "btn btn--primary btn--sm",
            href: "#contact",
            "data-enquire": serviceName(service),
          },
          "Discuss this service",
          icon("arrow-right", "icon--sm"),
        ),
      ),
      media,
    );

    /* Two groups sit side by side; a single long list splits into two columns. */
    const split = service.groups.length > 1;
    const groups = el(
      "div",
      { class: split ? "svc__groups svc__groups--split" : "svc__groups" },
      service.groups.map((group) =>
        el(
          "div",
          { class: "svc__group" },
          group.title ? el("h5", { class: "svc__group-title" }, group.title) : null,
          el(
            "ul",
            { class: !split && group.items.length > 5 ? "checklist checklist--cols" : "checklist" },
            group.items.map((item) => el("li", null, item)),
          ),
        ),
      ),
    );

    const result = service.result
      ? el(
          "p",
          { class: "svc__result" },
          el("span", { class: "tag" }, service.result.label),
          el("strong", null, service.result.text),
        )
      : null;

    return el(
      "div",
      {
        class: "explorer__panel",
        role: "tabpanel",
        id: `panel-${service.id}`,
        "aria-labelledby": `tab-${service.id}`,
        tabindex: "0",
        hidden: true,
      },
      head,
      groups,
      service.flow ? buildFlow(service.flow) : null,
      result,
    );
  }

  function buildExplorer() {
    const root = $("#explorer");
    if (!root) return;

    const tablist = el("div", {
      class: "explorer__tabs",
      role: "tablist",
      "aria-label": "Service lines",
    });
    const panelHost = el("div", { class: "explorer__panels" });
    const tabs = [];
    const panels = [];

    content.services.forEach((service) => {
      const tab = el(
        "button",
        {
          class: "explorer__tab",
          type: "button",
          role: "tab",
          id: `tab-${service.id}`,
          "aria-controls": `panel-${service.id}`,
        },
        icon(service.icon),
        el("span", null, serviceName(service)),
      );
      const panel = buildServicePanel(service);
      tabs.push(tab);
      panels.push(panel);
      tablist.append(tab);
      panelHost.append(panel);
    });
    root.append(tablist, panelHost);

    const setOrientation = () =>
      tablist.setAttribute("aria-orientation", wideScreen.matches ? "vertical" : "horizontal");
    setOrientation();
    wideScreen.addEventListener("change", setOrientation);

    serviceTabs = createTabs({
      tablist,
      tabs,
      panels,
      isVertical: () => wideScreen.matches,
      onChange(index) {
        /* On small screens the tabs are a sideways strip: keep the chosen one in view. */
        if (wideScreen.matches) return;
        const tab = tabs[index];
        tablist.scrollTo({
          left: tab.offsetLeft - (tablist.clientWidth - tab.offsetWidth) / 2,
          behavior: reducedMotion.matches ? "auto" : "smooth",
        });
      },
    });
    serviceTabs.select(0);
  }

  function openService(id) {
    const index = content.services.findIndex((service) => service.id === id);
    if (index < 0 || !serviceTabs) return false;
    serviceTabs.select(index);
    scrollToTarget($("#service-lines"));
    return true;
  }

  /* ---------- Training programs ---------- */

  let programTabs = null;

  function buildPrograms() {
    const tablist = $("#program-tabs");
    const host = $("#program-panels");
    if (!tablist || !host) return;
    const tabs = [];
    const panels = [];

    content.programs.forEach((program) => {
      const tab = el(
        "button",
        {
          class: "chip",
          type: "button",
          role: "tab",
          id: `program-tab-${program.id}`,
          "aria-controls": `program-${program.id}`,
        },
        program.title,
      );
      const panel = el(
        "div",
        {
          class: "program",
          role: "tabpanel",
          id: `program-${program.id}`,
          "aria-labelledby": `program-tab-${program.id}`,
          tabindex: "0",
          hidden: true,
        },
        el("p", { class: "program__meta" }, `${program.topics.length} topics`),
        el("h4", { class: "program__title" }, program.title),
        el(
          "ul",
          { class: "program__topics" },
          program.topics.map((topic) => el("li", null, topic)),
        ),
        el(
          "a",
          {
            class: "btn btn--ghost btn--sm",
            href: "#contact",
            "data-enquire": "Technical training",
            "data-enquire-note": program.title,
          },
          "Ask about this program",
          icon("arrow-right", "icon--sm"),
        ),
      );
      tabs.push(tab);
      panels.push(panel);
      tablist.append(tab);
      host.append(panel);
    });

    programTabs = createTabs({ tablist, tabs, panels });
    programTabs.select(0);
  }

  function openProgram(id) {
    const index = content.programs.findIndex((program) => program.id === id);
    if (index < 0 || !programTabs) return false;
    programTabs.select(index);
    scrollToTarget($("#training"));
    return true;
  }

  /* ---------- Why Nexvia ---------- */

  function buildValues() {
    const sheet = $("#value-sheet");
    if (!sheet) return;
    content.values.forEach((value) => {
      sheet.append(
        el(
          "div",
          { class: "sheet__row", id: `why-${value.id}`, "data-reveal": true },
          el("dt", { class: "sheet__label" }, value.title),
          el(
            "dd",
            { class: "sheet__body" },
            el("p", null, value.intro),
            value.items.length
              ? el(
                  "ul",
                  { class: "sheet__items" },
                  value.items.map((item) => el("li", null, item)),
                )
              : null,
            value.note ? el("p", { class: "sheet__note" }, value.note) : null,
          ),
        ),
      );
    });
  }

  /* ---------- Menus that list the services ---------- */

  function buildServiceMenus() {
    const byId = new Map(content.services.map((service) => [service.id, service]));

    const megaHost = $("#mega-columns");
    if (megaHost) {
      const columns = content.serviceGroups.map((group) =>
        el(
          "div",
          { class: "mega__col" },
          el("p", { class: "mega__heading" }, group.title),
          el(
            "ul",
            null,
            group.ids.map((id) => {
              const service = byId.get(id);
              return el(
                "li",
                null,
                el(
                  "a",
                  { class: "mega__link", href: `#${service.id}`, "data-service": service.id },
                  el("strong", null, serviceName(service)),
                  el("span", null, service.menu),
                ),
              );
            }),
          ),
        ),
      );
      const promo = el(
        "a",
        { class: "mega__promo", href: "#training" },
        el("img", {
          src: "assets/img/training-center.jpg",
          alt: "",
          width: 985,
          height: 813,
          loading: "lazy",
        }),
        el("strong", null, "Technical training & competency development"),
        el(
          "span",
          null,
          `${content.programs.length} training programs at our dedicated training center`,
        ),
      );
      megaHost.prepend(...columns, promo);
    }

    const footerList = $("#footer-services");
    const select = $("#f-service");
    content.services.forEach((service) => {
      const name = serviceName(service);
      if (footerList) {
        footerList.append(
          el("li", null, el("a", { href: `#${service.id}`, "data-service": service.id }, name)),
        );
      }
      if (select) select.append(el("option", { value: name }, name));
    });
    if (select) select.append(el("option", { value: "Technical training" }, "Technical training"));
  }

  /* ---------- Header: sticky state, Services panel, small-screen menu, current section ---------- */

  function initHeader() {
    const root = document.documentElement;
    const header = $("#site-header");
    const nav = $("#site-nav");
    const navToggle = $("#nav-toggle");
    const megaToggle = $("#mega-toggle");
    const mega = $("#mega-services");
    const toTop = $("#to-top");
    if (!header || !nav || !navToggle || !megaToggle || !mega) return;

    const megaItem = megaToggle.closest("li");
    let hoverTimer = 0;
    let openedAt = 0;

    function setMega(open) {
      if (open && mega.hidden) openedAt = window.performance.now();
      mega.hidden = !open;
      megaToggle.setAttribute("aria-expanded", String(open));
    }

    function setDrawer(open) {
      root.classList.toggle("nav-open", open);
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      if (!open) setMega(false);
    }

    megaToggle.addEventListener("click", () => {
      /* A hover has just opened it: a click straight after should not close it again. */
      if (!mega.hidden && window.performance.now() - openedAt < 450) return;
      setMega(mega.hidden);
    });

    megaItem.addEventListener("mouseenter", () => {
      if (!wideScreen.matches || !canHover.matches) return;
      window.clearTimeout(hoverTimer);
      hoverTimer = window.setTimeout(() => setMega(true), 90);
    });

    megaItem.addEventListener("mouseleave", () => {
      if (!wideScreen.matches || !canHover.matches) return;
      window.clearTimeout(hoverTimer);
      hoverTimer = window.setTimeout(() => setMega(false), 220);
    });

    megaItem.addEventListener("focusout", (event) => {
      if (wideScreen.matches && !megaItem.contains(event.relatedTarget)) setMega(false);
    });

    navToggle.addEventListener("click", () => setDrawer(!root.classList.contains("nav-open")));

    /* Following any link in the menu closes it. */
    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) setDrawer(false);
    });

    document.addEventListener("click", (event) => {
      if (wideScreen.matches && !mega.hidden && !megaItem.contains(event.target)) setMega(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (!mega.hidden) {
        const focusInside = megaItem.contains(document.activeElement);
        setMega(false);
        if (focusInside) megaToggle.focus();
      } else if (root.classList.contains("nav-open")) {
        setDrawer(false);
        navToggle.focus();
      }
    });

    wideScreen.addEventListener("change", () => setDrawer(false));

    const onScroll = () => {
      const y = window.scrollY;
      header.classList.toggle("is-scrolled", y > 8);
      /* The back-to-top button steps aside at the very end so it never covers the footer. */
      const nearEnd = y + window.innerHeight > root.scrollHeight - 160;
      if (toTop) toTop.hidden = y < 700 || nearEnd;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    /* Mark the menu entry of the section that is crossing the middle of the screen. */
    if (!("IntersectionObserver" in window)) return;
    const links = $$("[data-spy]", nav);
    const inView = new Set();
    const spy = new window.IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) inView.add(entry.target.id);
          else inView.delete(entry.target.id);
        });
        links.forEach((link) => {
          if (inView.has(link.dataset.spy)) link.setAttribute("aria-current", "true");
          else link.removeAttribute("aria-current");
        });
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    links.forEach((link) => {
      const section = document.getElementById(link.dataset.spy);
      if (section) spy.observe(section);
    });
  }

  /* ---------- Hero: looping video and rotating messages ---------- */

  function initHero() {
    const hero = $("#hero");
    const video = $("#hero-video");
    const tablist = $("#hero-tabs");
    const toggle = $("#hero-toggle");
    const slideHost = $("#hero-slides");
    if (!hero || !video || !tablist || !toggle || !slideHost) return;

    const slides = $$(".hero__slide", hero);
    const autoRotate = !reducedMotion.matches;
    const saveData = Boolean(navigator.connection && navigator.connection.saveData);
    let userPaused = false;
    let offscreen = false;

    /* One tab per slide. The bar inside each tab fills while its slide is on screen. */
    const tabs = slides.map((slide, i) =>
      el(
        "button",
        {
          class: "hero__tab",
          type: "button",
          role: "tab",
          id: `hero-tab-${i + 1}`,
          "aria-controls": slide.id,
          "aria-label": slide.dataset.label,
        },
        el("span", { class: "hero__tab-bar" }, el("span", { class: "hero__tab-fill" })),
        el("span", { class: "hero__tab-label" }, slide.dataset.label),
      ),
    );
    tablist.append(...tabs);
    slides.forEach((slide, i) => {
      slide.setAttribute("role", "tabpanel");
      slide.removeAttribute("aria-roledescription");
      slide.setAttribute("aria-labelledby", tabs[i].id);
    });

    const heroTabs = createTabs({
      tablist,
      tabs,
      onChange(index) {
        slides.forEach((slide, i) => {
          slide.classList.toggle("is-active", i === index);
          slide.setAttribute("aria-hidden", String(i !== index));
        });
      },
    });
    heroTabs.select(0);
    hero.classList.toggle("is-static", !autoRotate);

    /* The filling bar is the timer: when its animation ends, show the next slide. */
    tablist.addEventListener("animationend", (event) => {
      if (autoRotate && event.target.classList.contains("hero__tab-fill")) {
        heroTabs.select(heroTabs.index + 1);
      }
    });

    /* Rotation waits while someone is reading or using the slide. */
    const hold = (on) => hero.classList.toggle("is-held", on);
    [slideHost, tablist].forEach((zone) => {
      zone.addEventListener("mouseenter", () => {
        if (canHover.matches) hold(true);
      });
      zone.addEventListener("mouseleave", () => hold(false));
    });
    hero.addEventListener("focusin", (event) => {
      if (event.target !== toggle) hold(true);
    });
    hero.addEventListener("focusout", () => hold(false));

    function loadVideo() {
      if (video.getAttribute("src")) return;
      const small = window.matchMedia("(max-width: 760px)").matches;
      video.src = small ? video.dataset.srcSm : video.dataset.srcLg;
    }

    function play() {
      loadVideo();
      video.muted = true;
      const attempt = video.play();
      if (attempt && attempt.catch) {
        attempt.catch((error) => {
          /* The browser refused to autoplay: leave the poster up and offer the play button. */
          if (error && error.name === "NotAllowedError") setPaused(true);
        });
      }
    }

    function setPaused(paused) {
      userPaused = paused;
      hero.classList.toggle("is-paused", paused);
      toggle.setAttribute(
        "aria-label",
        paused ? "Play background video" : "Pause background video",
      );
      slideHost.setAttribute("aria-live", paused ? "polite" : "off");
      if (paused) video.pause();
      else if (!offscreen) play();
    }

    video.addEventListener("playing", () => hero.classList.add("has-video"));
    toggle.addEventListener("click", () => setPaused(!userPaused));

    /* Respect reduced motion and data saver: start on the still image. */
    setPaused(reducedMotion.matches || saveData);

    /* Stop the video and the timer while the hero is scrolled out of view. */
    if ("IntersectionObserver" in window) {
      new window.IntersectionObserver(
        ([entry]) => {
          offscreen = !entry.isIntersecting;
          hero.classList.toggle("is-offscreen", offscreen);
          if (offscreen) video.pause();
          else if (!userPaused) play();
        },
        { threshold: 0.05 },
      ).observe(hero);
    }
  }

  /* ---------- Search across services, training and the value proposition ---------- */

  function initSearch() {
    const dialog = $("#search");
    const opener = $("#search-open");
    const input = $("#search-input");
    const results = $("#search-results");
    const status = $("#search-status");
    const suggest = $("#search-suggest");
    if (!dialog || !opener || !input || !results || !status || !suggest) return;
    if (typeof dialog.showModal !== "function") {
      opener.hidden = true;
      return;
    }

    const LIMIT = 14;
    const normalize = (text) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

    /* Every searchable line, with where it lives and how to get there. */
    const entries = [];
    const add = (label, where, weight, go, extra = "") =>
      entries.push({ label, where, weight, go, text: normalize(`${label} ${extra}`) });

    content.services.forEach((service) => {
      const go = () => openService(service.id);
      add(service.title, "Service line", 3, go, `${service.summary} ${service.tag}`);
      service.groups.forEach((group) =>
        group.items.forEach((item) => add(item, `Service · ${serviceName(service)}`, 1, go)),
      );
    });
    content.programs.forEach((program) => {
      const go = () => openProgram(program.id);
      add(program.title, "Training program", 3, go);
      program.topics.forEach((topic) => add(topic, `Training · ${program.title}`, 1, go));
    });
    content.values.forEach((value) => {
      const go = () => scrollToTarget(document.getElementById(`why-${value.id}`));
      add(value.title, "Why Nexvia", 2, go, value.intro);
      value.items.forEach((item) => add(item, `Why Nexvia · ${value.title}`, 1, go));
    });

    function find(query) {
      const tokens = normalize(query).split(/\s+/).filter(Boolean);
      if (!tokens.length) return { tokens, matches: [] };
      const matches = entries
        .filter((entry) => tokens.every((token) => entry.text.includes(token)))
        .map((entry) => {
          const label = normalize(entry.label);
          const inLabel = tokens.every((token) => label.includes(token));
          return {
            entry,
            score: entry.weight * 2 + (inLabel ? 3 : 0) + (label.startsWith(tokens[0]) ? 2 : 0),
          };
        })
        .sort((a, b) => b.score - a.score)
        .map((match) => match.entry);
      return { tokens, matches };
    }

    /* Wraps the matched words of a label in <mark>. */
    function highlight(label, tokens) {
      const pattern = tokens.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
      const parts = label.split(new RegExp(`(${pattern})`, "gi"));
      return parts.map((part, i) => (i % 2 ? el("mark", null, part) : part));
    }

    function close() {
      if (dialog.open) dialog.close();
    }

    function render(query) {
      const { tokens, matches } = find(query);
      results.replaceChildren();
      suggest.hidden = tokens.length > 0;

      if (!tokens.length) {
        status.textContent = "Try one of these";
        return;
      }
      if (!matches.length) {
        status.textContent = `No results for "${query.trim()}"`;
        return;
      }
      const shown = matches.slice(0, LIMIT);
      status.textContent =
        matches.length > LIMIT
          ? `Showing ${LIMIT} of ${matches.length} results`
          : `${matches.length} ${matches.length === 1 ? "result" : "results"}`;

      shown.forEach((entry) => {
        const button = el(
          "button",
          { class: "search__result", type: "button" },
          el("span", { class: "search__result-title" }, highlight(entry.label, tokens)),
          el("span", { class: "search__result-where" }, entry.where),
        );
        button.addEventListener("click", () => {
          close();
          entry.go();
        });
        results.append(el("li", null, button));
      });
    }

    content.searchSuggestions.forEach((term) => {
      const chip = el("button", { class: "search__chip", type: "button" }, term);
      chip.addEventListener("click", () => {
        input.value = term;
        render(term);
        input.focus();
      });
      suggest.append(chip);
    });

    function open() {
      input.value = "";
      render("");
      dialog.showModal();
      input.focus();
    }

    opener.addEventListener("click", open);
    $("#search-close").addEventListener("click", close);
    input.addEventListener("input", () => render(input.value));

    /* A click on the dimmed area around the box closes it. */
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) close();
    });

    /* Enter opens the first result; the arrow keys walk through the list. */
    dialog.addEventListener("keydown", (event) => {
      /* A search field keeps the first Esc for clearing its text, so close the box here. */
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      const buttons = $$(".search__result", results);
      if (!buttons.length) return;
      const at = buttons.indexOf(document.activeElement);
      if (event.key === "Enter" && event.target === input) {
        event.preventDefault();
        buttons[0].click();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        buttons[Math.min(at + 1, buttons.length - 1)].focus();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        if (at <= 0) input.focus();
        else buttons[at - 1].focus();
      }
    });

    /* "/" opens search from anywhere, unless the visitor is typing in a field. */
    document.addEventListener("keydown", (event) => {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey || dialog.open)
        return;
      const target = event.target;
      const typing =
        target instanceof window.HTMLElement &&
        (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
      if (typing) return;
      event.preventDefault();
      open();
    });
  }

  /* ---------- Contact ---------- */

  /* "Discuss this service" links choose the matching option in the form. */
  function prefillEnquiry(serviceLabel, note) {
    const select = $("#f-service");
    const message = $("#f-message");
    const form = $("#contact-form");
    const ready = $("#form-ready");
    if (!select || !message || !form || !ready) return;
    if ($$("option", select).some((option) => option.value === serviceLabel)) {
      select.value = serviceLabel;
    }
    if (note && !message.value.trim()) {
      message.value = `I would like to know more about your ${note} training program.`;
    }
    ready.hidden = true;
    form.hidden = false;
  }

  function initContact() {
    const form = $("#contact-form");
    const ready = $("#form-ready");
    if (!form || !ready) return;

    const preview = $("#ready-preview");
    const mailto = $("#ready-mailto");
    const status = $("#ready-status");
    const field = (name) => form.elements.namedItem(name);

    const rules = [
      [field("name"), (value) => (value ? "" : "Enter your name.")],
      [
        field("email"),
        (value) => {
          if (!value) return "Enter your email address.";
          return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
            ? ""
            : "Enter an email address like name@company.com.";
        },
      ],
      [field("message"), (value) => (value ? "" : "Write a short message.")],
    ];

    function check(input, rule) {
      const problem = rule(input.value.trim());
      const error = document.getElementById(`${input.id}-error`);
      input.closest(".field").classList.toggle("is-invalid", Boolean(problem));
      input.setAttribute("aria-invalid", String(Boolean(problem)));
      if (problem) input.setAttribute("aria-describedby", error.id);
      else input.removeAttribute("aria-describedby");
      error.textContent = problem;
      error.hidden = !problem;
      return !problem;
    }

    /*
     * Errors appear on submit and clear as the visitor types. Nothing is checked on blur:
     * a message that appears or vanishes while the pointer is going down on the button
     * moves the button and the click misses it.
     */
    rules.forEach(([input, rule]) => {
      input.addEventListener("input", () => {
        if (input.closest(".field").classList.contains("is-invalid")) check(input, rule);
      });
    });

    /*
     * There is no server behind this page, so the form cannot send anything itself.
     * It checks the fields and lays the message out as an email the visitor sends.
     */
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const failed = rules.filter(([input, rule]) => !check(input, rule));
      if (failed.length) {
        failed[0][0].focus();
        return;
      }

      const value = (name) => field(name).value.trim();
      const to = content.contactEmail;
      const subject = `Website enquiry: ${value("service")} (${value("name")})`;
      const body = [
        `Name: ${value("name")}`,
        value("company") ? `Company: ${value("company")}` : null,
        `Email: ${value("email")}`,
        value("phone") ? `Phone: ${value("phone")}` : null,
        `Service of interest: ${value("service")}`,
        "",
        value("message"),
      ]
        .filter((line) => line !== null)
        .join("\n");

      mailto.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      preview.textContent = `To: ${to}\nSubject: ${subject}\n\n${body}`;
      status.textContent = "";
      form.hidden = true;
      ready.hidden = false;
      ready.focus({ preventScroll: true });
      ready.scrollIntoView({ block: "nearest" });
    });

    $("#ready-copy").addEventListener("click", () => {
      copyText(preview.textContent, preview).then((copied) => {
        status.textContent = copied
          ? "Message copied. Paste it into a new email."
          : "The message is selected. Copy it and paste it into a new email.";
      });
    });

    $("#ready-edit").addEventListener("click", () => {
      ready.hidden = true;
      form.hidden = false;
      field("message").focus();
    });
  }

  function initCopyButtons() {
    $$("[data-copy]").forEach((button) => {
      const label = $(".copy__label", button);
      let timer = 0;
      label.setAttribute("aria-live", "polite");
      button.addEventListener("click", () => {
        copyText(button.dataset.copy, button.previousElementSibling).then((copied) => {
          label.textContent = copied ? "Copied" : "Selected";
          button.classList.toggle("is-done", copied);
          window.clearTimeout(timer);
          timer = window.setTimeout(() => {
            label.textContent = "Copy";
            button.classList.remove("is-done");
          }, 2200);
        });
      });
    });
  }

  /* ---------- Links that open a service, a program or the enquiry form ---------- */

  function initLinks() {
    document.addEventListener("click", (event) => {
      if (!(event.target instanceof window.Element)) return;
      const serviceLink = event.target.closest("[data-service]");
      if (serviceLink) openService(serviceLink.dataset.service);

      const enquiry = event.target.closest("[data-enquire]");
      if (enquiry) prefillEnquiry(enquiry.dataset.enquire, enquiry.dataset.enquireNote);
    });
  }

  /* Opens what the address points at, e.g. page.html#mechanical or #compressors. */
  function route(firstLoad) {
    let id = "";
    try {
      id = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      return;
    }
    if (!id || openService(id) || openProgram(id)) return;
    /* The lists built above changed the page height, so line the section up again. */
    const target = firstLoad ? document.getElementById(id) : null;
    if (target) target.scrollIntoView({ behavior: "auto", block: "start" });
  }

  /* ---------- Blocks below the fold rise into place ---------- */

  function initReveal() {
    if (reducedMotion.matches || !("IntersectionObserver" in window)) return;
    const fold = window.innerHeight;
    const waiting = $$("[data-reveal]").filter((node) => node.getBoundingClientRect().top > fold);
    if (!waiting.length) return;

    const observer = new window.IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const node = entry.target;
          observer.unobserve(node);
          /* Once it has landed, drop the helper classes so hover effects work as normal. */
          const settle = (event) => {
            if (event.target !== node) return;
            node.removeEventListener("transitionend", settle);
            node.classList.remove("will-rise", "is-in");
            node.style.transitionDelay = "";
          };
          node.addEventListener("transitionend", settle);
          node.classList.add("is-in");
        });
      },
      { rootMargin: "0px 0px -6% 0px" },
    );

    waiting.forEach((node) => {
      /* Neighbours in a row arrive one after another. */
      const position = Array.from(node.parentElement.children).indexOf(node);
      node.style.transitionDelay = `${(position % 4) * 70}ms`;
      node.classList.add("will-rise");
      observer.observe(node);
    });
  }

  /* ---------- Start ---------- */

  function start() {
    if (!content) return;
    buildServiceMenus();
    buildDisciplines();
    buildExplorer();
    buildPrograms();
    buildValues();

    initHeader();
    initHero();
    initSearch();
    initContact();
    initCopyButtons();
    initLinks();

    const year = $("#year");
    if (year) year.textContent = String(new Date().getFullYear());

    route(true);
    window.addEventListener("hashchange", () => route(false));
    initReveal();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})(globalThis);
