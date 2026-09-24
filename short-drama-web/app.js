const data = window.NEWS_ANALYSIS;

const state = {
  galleryCards: [],
  mouseX: 0,
  mouseY: 0,
  galleryExpanded: false,
};

function $(selector, scope = document) {
  return scope.querySelector(selector);
}

function $$(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function createSVG(width, height) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("class", "svg-root");
  svg.setAttribute("preserveAspectRatio", "none");
  return svg;
}

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  return el;
}

function formatNumber(value) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function heroSetup() {
  $("#heroSubtitle").textContent = data.meta.subtitle;
  $("#heroQuote").textContent = data.quotes[0];

  const metrics = [
    `${formatNumber(data.overview.total)} 篇样本`,
    `${data.overview.dateRange?.start || data.meta.dateRange.start} - ${data.meta.dateRange.end}`,
    `${data.overview.latestRatio}% 集中于 2025-2026`,
    `峰值 ${data.overview.peakMonth}`,
  ];

  $("#heroMetrics").innerHTML = metrics
    .map((item) => `<span class="hero-chip">${item}</span>`)
    .join("");

  const gallery = $("#heroGallery");
  const toggle = $("#galleryToggle");
  const positions = [
    [-42, -30, -18, 0.94], [-24, -39, 14, 0.78], [2, -44, -8, 0.72],
    [28, -33, 11, 0.88], [46, -16, -12, 0.8], [-52, 6, 8, 0.78],
    [-28, 19, -15, 0.92], [3, 18, 2, 1.12], [31, 16, 10, 0.9],
    [52, 2, -8, 0.76], [-37, 41, 12, 0.82], [-5, 44, -5, 0.78],
    [26, 40, 7, 0.84],
  ];
  const expandedPositions = [
    [-40, -30, -8, 0.92], [-18, -34, 6, 0.82], [6, -34, -3, 0.78],
    [28, -31, 8, 0.86], [48, -26, -5, 0.82], [-46, -3, 10, 0.8],
    [-18, -5, -8, 0.88], [2, 0, 0, 1.16], [25, -2, 6, 0.92],
    [46, 3, -8, 0.84], [-36, 27, 8, 0.84], [-9, 31, -4, 0.8],
    [21, 29, 5, 0.86],
  ];

  const images = data.galleryImages;
  gallery.innerHTML = "";
  state.galleryCards = positions.map((pos, index) => {
    const card = document.createElement("div");
    card.className = "gallery-card";
    card.innerHTML = `<img src="${images[index % images.length]}" alt="AI短剧封面 ${index + 1}">`;
    card.dataset.x = pos[0];
    card.dataset.y = pos[1];
    card.dataset.rotate = pos[2];
    card.dataset.scale = pos[3];
    card.dataset.depth = String((index % 5) * 55 + 40);
    card.dataset.ex = expandedPositions[index][0];
    card.dataset.ey = expandedPositions[index][1];
    card.dataset.erotate = expandedPositions[index][2];
    card.dataset.escale = expandedPositions[index][3];
    gallery.appendChild(card);
    return card;
  });

  const toggleGallery = () => {
    state.galleryExpanded = !state.galleryExpanded;
    gallery.classList.toggle("is-expanded", state.galleryExpanded);
    toggle.classList.toggle("is-active", state.galleryExpanded);
    toggle.textContent = state.galleryExpanded ? "点击收起封面画廊" : "点击展开封面画廊";
    updateHeroMotion();
  };

  toggle?.addEventListener("click", toggleGallery);
  gallery.addEventListener("click", toggleGallery);

  updateHeroMotion();
}

function updateHeroMotion() {
  const hero = $("#hero");
  if (!hero) return;

  const rect = hero.getBoundingClientRect();
  const scrollProgress = clamp(-rect.top / rect.height, 0, 1);
  const nx = (state.mouseX / window.innerWidth - 0.5) * 2;
  const ny = (state.mouseY / window.innerHeight - 0.5) * 2;
  const isExpanded = state.galleryExpanded;

  state.galleryCards.forEach((card, index) => {
    const x = Number(isExpanded ? card.dataset.ex : card.dataset.x);
    const y = Number(isExpanded ? card.dataset.ey : card.dataset.y);
    const rotate = Number(isExpanded ? card.dataset.erotate : card.dataset.rotate);
    const scale = Number(isExpanded ? card.dataset.escale : card.dataset.scale);
    const depth = isExpanded ? 0 : Number(card.dataset.depth);
    const offsetX = isExpanded ? nx * (3 + index * 0.05) : nx * (8 + index * 0.12);
    const offsetY = isExpanded ? ny * (3 + index * 0.04) : ny * (6 + index * 0.08);
    const travelY = scrollProgress * (isExpanded ? 18 + index * 0.5 : 40 + index * 1.4);
    const opacity = isExpanded ? 0.96 - scrollProgress * 0.42 : 1 - scrollProgress * 1.08;
    const localScale = scale - scrollProgress * (isExpanded ? 0.03 : 0.08);
    const rotateY = isExpanded ? nx * 3 : nx * 10;
    const rotateX = isExpanded ? -ny * 2 : -ny * 8;
    card.style.opacity = opacity.toFixed(3);
    card.style.transform =
      `translate3d(calc(${x}% + ${offsetX}px), calc(${y}% + ${offsetY + travelY}px), ${depth - scrollProgress * 160}px) ` +
      `translate(-50%, -50%) rotateZ(${rotate + (isExpanded ? nx * 1.5 : nx * 4)}deg) rotateY(${rotateY}deg) rotateX(${rotateX}deg) scale(${localScale})`;
    card.style.filter = `blur(${scrollProgress * (isExpanded ? 0.6 : 1.5)}px)`;
  });

  const center = $(".hero-center");
  if (center) {
    center.style.transform = `translateY(${scrollProgress * 60}px) scale(${1 - scrollProgress * 0.08})`;
    center.style.opacity = `${1 - scrollProgress * 1.15}`;
  }
}

function renderOverviewStats() {
  const stats = [
    {
      label: "样本总量",
      value: formatNumber(data.overview.total),
      note: `时间跨度 ${data.meta.dateRange.start} 至 ${data.meta.dateRange.end}`,
    },
    {
      label: "高峰月份",
      value: data.overview.peakMonth,
      note: `单月 ${data.overview.peakMonthValue} 篇，是整段数据中的最高点`,
    },
    {
      label: "近两年占比",
      value: `${data.overview.latestRatio}%`,
      note: "2025—2026 的讨论密度显著抬升",
    },
    {
      label: "平均篇幅",
      value: `${formatNumber(data.overview.averageLength)}`,
      note: "按正文字符数估算，整体偏深度报道体量",
    },
  ];

  $("#overviewStats").innerHTML = stats
    .map(
      (item) => `
        <article class="stat-card reveal">
          <div class="stat-card-label">${item.label}</div>
          <div class="stat-card-value">${item.value}</div>
          <div class="stat-card-note">${item.note}</div>
        </article>
      `
    )
    .join("");
}

function renderBars(containerId, items, colorA = "#7bd3c7", colorB = "#d49a6a") {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  const width = container.clientWidth || 600;
  const height = container.clientHeight || 300;
  const svg = createSVG(width, height);
  const padding = { top: 18, right: 12, bottom: 42, left: 10 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const max = Math.max(...items.map((item) => item.value), 1);
  const barWidth = innerWidth / items.length * 0.64;
  const gap = innerWidth / items.length;

  items.forEach((item, index) => {
    const x = padding.left + gap * index + (gap - barWidth) / 2;
    const barHeight = innerHeight * (item.value / max);
    const y = padding.top + innerHeight - barHeight;

    const rect = svgEl("rect", {
      x,
      y,
      width: barWidth,
      height: barHeight,
      rx: 12,
      fill: `url(#grad-${containerId})`,
      class: "bar-rect",
    });
    const value = svgEl("text", {
      x: x + barWidth / 2,
      y: y - 8,
      "text-anchor": "middle",
      class: "chart-note",
    });
    value.textContent = item.value;

    const label = svgEl("text", {
      x: x + barWidth / 2,
      y: height - 14,
      "text-anchor": "middle",
      class: "axis-label",
    });
    label.textContent = item.label;

    svg.append(rect, value, label);
  });

  const defs = svgEl("defs");
  const gradient = svgEl("linearGradient", { id: `grad-${containerId}`, x1: "0", y1: "0", x2: "0", y2: "1" });
  gradient.append(
    svgEl("stop", { offset: "0%", "stop-color": colorA }),
    svgEl("stop", { offset: "100%", "stop-color": colorB })
  );
  defs.append(gradient);
  svg.prepend(defs);

  container.appendChild(svg);
}

function linePath(points) {
  if (!points.length) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point[0]} ${point[1]}`)
    .join(" ");
}

function areaPath(points, baseY) {
  if (!points.length) return "";
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath(points)} L ${last[0]} ${baseY} L ${first[0]} ${baseY} Z`;
}

function renderLineChart(containerId, labels, series, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  const width = container.clientWidth || 900;
  const height = container.clientHeight || 360;
  const svg = createSVG(width, height);
  const padding = { top: 18, right: 18, bottom: 40, left: 24 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const max = Math.max(1, ...series.flatMap((item) => item.values));
  const stepX = labels.length > 1 ? innerWidth / (labels.length - 1) : innerWidth;
  const baseY = padding.top + innerHeight;

  for (let i = 0; i < 4; i += 1) {
    const y = padding.top + (innerHeight / 3) * i;
    svg.append(svgEl("line", { x1: padding.left, y1: y, x2: width - padding.right, y2: y, class: "grid-line" }));
  }

  labels.forEach((label, index) => {
    if (labels.length > 8 && index % 2 === 1) return;
    const x = padding.left + stepX * index;
    const text = svgEl("text", { x, y: height - 14, "text-anchor": "middle", class: "axis-label" });
    text.textContent = label.replace("202", "2").replace("-", ".");
    svg.append(text);
  });

  series.forEach((item) => {
    const points = item.values.map((value, index) => {
      const x = padding.left + stepX * index;
      const y = baseY - innerHeight * (value / max);
      return [x, y];
    });

    if (options.area) {
      svg.append(
        svgEl("path", {
          d: areaPath(points, baseY),
          fill: item.color,
          class: "area-path",
        })
      );
    }

    svg.append(svgEl("path", { d: linePath(points), stroke: item.color, class: "line-path" }));

    points.forEach(([x, y], pointIndex) => {
      const circle = svgEl("circle", { cx: x, cy: y, r: 4, fill: item.color });
      svg.append(circle);
      if (!options.multi || pointIndex === points.length - 1) {
        const value = svgEl("text", { x, y: y - 10, "text-anchor": "middle", class: "chart-note" });
        value.textContent = item.values[pointIndex];
        svg.append(value);
      }
    });
  });

  if (options.multi) {
    const legendGroup = svgEl("g");
    series.forEach((item, index) => {
      const x = padding.left + index * 118;
      legendGroup.append(
        svgEl("circle", { cx: x + 8, cy: 12, r: 4, fill: item.color }),
        svgEl("text", { x: x + 20, y: 16, class: "axis-label" })
      );
      legendGroup.lastChild.textContent = item.label;
    });
    svg.append(legendGroup);
  }

  container.appendChild(svg);
}

function renderKeywordStream() {
  const stage = $("#keywordStage");
  stage.innerHTML = "";
  const stream = data.keywords.stream;
  const colors = ["cyan", "orange"];

  function launchWord() {
    const item = stream[Math.floor(Math.random() * stream.length)];
    const word = document.createElement("span");
    word.className = `danmu-word ${colors[Math.floor(Math.random() * colors.length)]}`;
    word.textContent = item.label;

    const top = Math.random() * (stage.clientHeight - 40);
    const size = 14 + Math.min(item.value, 18) * 1.2;
    const duration = 8 + Math.random() * 8;
    const weight = item.value > 12 ? 600 : 400;

    word.style.top = `${top}px`;
    word.style.fontSize = `${size}px`;
    word.style.fontWeight = weight;
    word.style.animationDuration = `${duration}s`;

    stage.appendChild(word);
    window.setTimeout(() => word.remove(), duration * 1000);
  }

  for (let i = 0; i < 16; i += 1) {
    window.setTimeout(launchWord, i * 320);
  }

  window.setInterval(launchWord, 760);
}

function renderKeywordCloud() {
  const container = $("#keywordCloud");
  container.innerHTML = data.keywords.stream
    .slice(0, 24)
    .map((item) => `<span class="keyword-pill">${item.label}<strong>${item.value}</strong></span>`)
    .join("");
}

function donutArc(cx, cy, r, startAngle, endAngle) {
  const start = polar(cx, cy, r, endAngle);
  const end = polar(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return [
    "M", start.x, start.y,
    "A", r, r, 0, largeArc, 0, end.x, end.y,
  ].join(" ");
}

function polar(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function renderTopicCards() {
  const container = $("#topicCards");
  const max = Math.max(...data.topics.summary.map((item) => item.value));
  container.innerHTML = data.topics.summary
    .map((item) => {
      const ratio = item.value / max;
      const circumference = 2 * Math.PI * 48;
      const offset = circumference * (1 - ratio);
      return `
        <article class="topic-card reveal">
          <div class="topic-card-head">
            <div>
              <h3 class="topic-card-title">${item.label}</h3>
              <div class="topic-card-count">${item.value} 篇</div>
            </div>
            <svg class="topic-card-ring" viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="10" class="topic-ring-track"></circle>
              <circle cx="60" cy="60" r="48" fill="none" stroke="${item.color}" stroke-width="10" stroke-linecap="round"
                stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
                transform="rotate(-90 60 60)" class="topic-ring-value"></circle>
              <text x="60" y="66" text-anchor="middle" fill="#f3f4f6" font-size="22">${item.value}</text>
            </svg>
          </div>
          <p>${item.description}</p>
          <div class="topic-samples">
            ${item.samples.slice(0, 3).map((sample) => `<div class="topic-sample">${sample}</div>`).join("")}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderSentimentDonut() {
  const container = $("#sentimentDonut");
  container.innerHTML = "";
  const width = container.clientWidth || 480;
  const height = container.clientHeight || 340;
  const svg = createSVG(width, height);
  const cx = width * 0.38;
  const cy = height * 0.5;
  const radius = Math.min(width, height) * 0.24;
  const total = data.sentiment.summary.reduce((sum, item) => sum + item.value, 0);
  let start = 0;

  data.sentiment.summary.forEach((item, index) => {
    const span = (item.value / total) * 360;
    const path = svgEl("path", {
      d: donutArc(cx, cy, radius, start, start + span),
      stroke: item.color,
      "stroke-width": 20,
      fill: "none",
      class: "donut-slice",
    });
    svg.append(path);

    const legendY = 70 + index * 56;
    svg.append(svgEl("circle", { cx: width * 0.68, cy: legendY, r: 6, fill: item.color }));
    const label = svgEl("text", { x: width * 0.68 + 16, y: legendY + 4, class: "axis-label" });
    label.textContent = `${item.label} · ${item.value} 篇`;
    svg.append(label);

    const pct = svgEl("text", { x: width * 0.68 + 16, y: legendY + 24, class: "chart-note" });
    pct.textContent = `${((item.value / total) * 100).toFixed(1)}%`;
    svg.append(pct);

    start += span;
  });

  svg.append(
    svgEl("text", { x: cx, y: cy - 8, "text-anchor": "middle", fill: "#f3f4f6", "font-size": "34" }),
    svgEl("text", { x: cx, y: cy + 20, "text-anchor": "middle", class: "chart-note" })
  );
  svg.childNodes[svg.childNodes.length - 2].textContent = data.overview.total;
  svg.childNodes[svg.childNodes.length - 1].textContent = "总报道数";

  container.appendChild(svg);
}

function renderRoleCompare() {
  const container = $("#roleCompare");
  container.innerHTML = "";
  const width = container.clientWidth || 520;
  const height = container.clientHeight || 340;
  const svg = createSVG(width, height);
  const padding = { top: 26, right: 16, bottom: 24, left: 102 };
  const barHeight = 26;
  const gap = 24;
  const max = Math.max(...data.roles.summary.map((item) => item.value), 1);

  data.roles.summary.forEach((item, index) => {
    const y = padding.top + index * (barHeight + gap);
    const totalWidth = (item.value / max) * (width - padding.left - padding.right);
    let cursor = padding.left;

    const label = svgEl("text", { x: 0, y: y + 18, class: "axis-label" });
    label.textContent = item.label;
    svg.append(label);

    item.breakdown.forEach((part, partIndex) => {
      const segmentWidth = totalWidth * (part / item.value || 0);
      const rect = svgEl("rect", {
        x: cursor,
        y,
        width: segmentWidth,
        height: barHeight,
        rx: 13,
        fill: data.roles.colors[partIndex],
        class: "stack-segment",
      });
      svg.append(rect);
      cursor += segmentWidth;
    });

    const value = svgEl("text", { x: padding.left + totalWidth + 10, y: y + 18, class: "chart-note" });
    value.textContent = `${item.value}`;
    svg.append(value);
  });

  data.roles.labels.forEach((labelText, index) => {
    const legendX = padding.left + index * 96;
    svg.append(svgEl("circle", { cx: legendX, cy: 14, r: 5, fill: data.roles.colors[index] }));
    const text = svgEl("text", { x: legendX + 12, y: 18, class: "axis-label" });
    text.textContent = labelText;
    svg.append(text);
  });

  container.appendChild(svg);
}

function renderNetwork() {
  const container = $("#networkGraph");
  container.innerHTML = "";
  const width = container.clientWidth || 900;
  const height = container.clientHeight || 560;
  const svg = createSVG(width, height);
  const nodes = data.network.nodes;
  const links = data.network.links;
  const maxValue = Math.max(...nodes.map((node) => node.value), 1);
  const cx = width / 2;
  const cy = height / 2;

  const positioned = nodes.map((node, index) => {
    const angle = (Math.PI * 2 * index) / nodes.length;
    const ring = index < 4 ? 0.36 : index < 9 ? 0.58 : 0.78;
    const rx = width * ring * 0.42;
    const ry = height * ring * 0.34;
    return {
      ...node,
      x: cx + Math.cos(angle) * rx,
      y: cy + Math.sin(angle) * ry,
      r: 12 + (node.value / maxValue) * 26,
    };
  });

  links.forEach((link) => {
    const source = positioned.find((node) => node.id === link.source);
    const target = positioned.find((node) => node.id === link.target);
    if (!source || !target) return;
    const curveX = (source.x + target.x) / 2;
    const curveY = (source.y + target.y) / 2 - Math.abs(source.x - target.x) * 0.08;
    const path = svgEl("path", {
      d: `M ${source.x} ${source.y} Q ${curveX} ${curveY} ${target.x} ${target.y}`,
      fill: "none",
      stroke: "rgba(255,255,255,0.18)",
      "stroke-width": String(0.5 + link.value / 8),
      class: "network-link",
    });
    svg.append(path);
  });

  positioned.forEach((node) => {
    svg.append(
      svgEl("circle", {
        cx: node.x,
        cy: node.y,
        r: node.r + 6,
        fill: "rgba(123,211,199,0.08)",
      }),
      svgEl("circle", {
        cx: node.x,
        cy: node.y,
        r: node.r,
        fill: node.value > maxValue * 0.7 ? "#d49a6a" : "#7bd3c7",
        class: "network-node",
      })
    );

    const label = svgEl("text", {
      x: node.x,
      y: node.y + 4,
      "text-anchor": "middle",
      fill: "#111315",
      "font-size": String(Math.max(11, node.r * 0.42)),
      "font-weight": "700",
    });
    label.textContent = node.label;
    svg.append(label);
  });

  container.appendChild(svg);
}

function renderRecentArticles() {
  const container = $("#recentArticles");
  container.innerHTML = data.recentArticles
    .map(
      (item) => `
        <a class="article-item" href="${item.url}" target="_blank" rel="noreferrer">
          <div class="article-meta">
            <span>${item.date}</span>
            <span>${item.topic}</span>
            <span>${item.sentiment}</span>
          </div>
          <h4>${item.title}</h4>
          <p>${item.excerpt}...</p>
        </a>
      `
    )
    .join("");
}

function setupReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    },
    { threshold: 0.12 }
  );

  $$(".reveal").forEach((el) => observer.observe(el));
}

function setupNav() {
  const links = $$(".nav a");
  const sections = links
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  function updateActive() {
    const offset = window.scrollY + 180;
    sections.forEach((section, index) => {
      const start = section.offsetTop;
      const end = start + section.offsetHeight;
      const active = offset >= start && offset < end;
      links[index].classList.toggle("is-active", active);
    });
  }

  window.addEventListener("scroll", updateActive, { passive: true });
  updateActive();
}

function setupCursor() {
  const dot = $(".cursor-dot");
  const ring = $(".cursor-ring");
  if (!dot || !ring || window.innerWidth <= 760) return;

  let ringX = 0;
  let ringY = 0;

  function tick() {
    ringX += (state.mouseX - ringX) * 0.14;
    ringY += (state.mouseY - ringY) * 0.14;
    dot.style.left = `${state.mouseX}px`;
    dot.style.top = `${state.mouseY}px`;
    ring.style.left = `${ringX}px`;
    ring.style.top = `${ringY}px`;
    requestAnimationFrame(tick);
  }

  document.addEventListener("mousemove", (event) => {
    state.mouseX = event.clientX;
    state.mouseY = event.clientY;
  });

  $$("a, .panel, .topic-card, .stat-card").forEach((el) => {
    el.addEventListener("mouseenter", () => {
      ring.style.width = "62px";
      ring.style.height = "62px";
      ring.style.borderColor = "rgba(212, 154, 106, 0.65)";
    });
    el.addEventListener("mouseleave", () => {
      ring.style.width = "42px";
      ring.style.height = "42px";
      ring.style.borderColor = "rgba(123, 211, 199, 0.5)";
    });
  });

  tick();
}

function setupScrollEffects() {
  const quoteEl = $("#heroQuote");

  window.addEventListener(
    "scroll",
    () => {
      updateHeroMotion();
      const progress = clamp(window.scrollY / window.innerHeight, 0, 2.6);
      quoteEl.textContent = data.quotes[Math.min(data.quotes.length - 1, Math.floor(progress))];
    },
    { passive: true }
  );

  window.addEventListener("mousemove", (event) => {
    state.mouseX = event.clientX;
    state.mouseY = event.clientY;
    updateHeroMotion();
  });
}

function renderAllCharts() {
  renderBars("yearBars", data.overview.yearSummary, "#7bd3c7", "#4aa7b8");
  renderBars("weekdayBars", data.overview.weekdaySummary, "#d49a6a", "#7bd3c7");

  const monthlyValues = data.overview.monthlySeries
    .filter((item) => data.overview.recentMonths.includes(item.month));
  renderLineChart(
    "monthlyTrend",
    monthlyValues.map((item) => item.month),
    [{ label: "报道量", values: monthlyValues.map((item) => item.value), color: "#7bd3c7" }],
    { area: true }
  );

  renderLineChart(
    "topicTrend",
    data.topics.trendMonths,
    data.topics.trendSeries.map((item) => ({
      label: item.label,
      values: item.values,
      color: item.color,
    })),
    { multi: true }
  );

  renderSentimentDonut();
  renderRoleCompare();
  renderNetwork();
}

function boot() {
  state.mouseX = window.innerWidth / 2;
  state.mouseY = window.innerHeight / 2;
  heroSetup();
  renderOverviewStats();
  renderKeywordCloud();
  renderTopicCards();
  renderRecentArticles();
  renderKeywordStream();
  renderAllCharts();
  setupReveal();
  setupNav();
  setupCursor();
  setupScrollEffects();

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      updateHeroMotion();
      renderAllCharts();
    }, 120);
  });
}

document.addEventListener("DOMContentLoaded", boot);
