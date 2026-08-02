/* ARTICLE-TO-COURSE — interaction engine.
   Class/data-* driven, event delegation, no globals required by markup. */
;(function () {
  'use strict'

  /* ── scroll progress bar ───────────────────────────────── */
  var progressBar = document.getElementById('progressBar')
  function updateProgress() {
    if (!progressBar) return
    var doc = document.documentElement
    var max = doc.scrollHeight - window.innerHeight
    var pct = max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 100
    progressBar.style.width = pct + '%'
    progressBar.setAttribute('aria-valuenow', String(Math.round(pct)))
  }
  window.addEventListener('scroll', updateProgress, { passive: true })
  updateProgress()

  /* ── reveal on scroll ──────────────────────────────────── */
  var revealIO = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in')
          revealIO.unobserve(en.target)
        }
      })
    },
    { threshold: 0.08, rootMargin: '0px 0px -4% 0px' },
  )
  document.querySelectorAll('.reveal').forEach(function (el) {
    revealIO.observe(el)
  })

  /* ── toc active chapter ────────────────────────────────── */
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll('.toc-link'))
  var chapters = Array.prototype.slice.call(document.querySelectorAll('.chapter'))
  if (tocLinks.length && chapters.length) {
    var tocIO = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return
          var id = en.target.id
          tocLinks.forEach(function (l) {
            l.classList.toggle('active', l.getAttribute('data-chapter') === id)
          })
        })
      },
      { rootMargin: '-25% 0px -65% 0px' },
    )
    chapters.forEach(function (c) {
      tocIO.observe(c)
    })
  }

  /* ── keyboard chapter navigation ───────────────────────── */
  document.addEventListener('keydown', function (e) {
    var t = e.target
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return
    var idx = -1
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') idx = 1
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') idx = -1
    else return
    if (!chapters.length) return
    var mid = window.scrollY + window.innerHeight * 0.3
    var current = 0
    chapters.forEach(function (c, i) {
      if (c.offsetTop <= mid) current = i
    })
    var next = Math.min(chapters.length - 1, Math.max(0, current + idx))
    chapters[next].scrollIntoView({ behavior: 'smooth', block: 'start' })
    e.preventDefault()
  })

  /* ── glossary term tooltips ────────────────────────────── */
  var tooltip = null
  function getTooltip() {
    if (!tooltip) {
      tooltip = document.createElement('div')
      tooltip.className = 'term-tooltip'
      document.body.appendChild(tooltip)
    }
    return tooltip
  }
  function showTerm(term) {
    var def = term.getAttribute('data-definition')
    if (!def) return
    var tip = getTooltip()
    tip.textContent = def
    tip.classList.add('show')
    var r = term.getBoundingClientRect()
    var tipW = Math.min(300, window.innerWidth - 32)
    tip.style.maxWidth = tipW + 'px'
    var x = r.left + window.scrollX
    var y = r.bottom + window.scrollY + 8
    tip.style.left = '0px'
    tip.style.top = '0px'
    tip.classList.remove('flip')
    var tr = tip.getBoundingClientRect()
    var w = tr.width
    var h = tr.height
    x = Math.max(12 + window.scrollX, Math.min(x, window.scrollX + window.innerWidth - w - 12))
    var flip = r.bottom + 8 + h > window.innerHeight && r.top - 8 - h > 0
    if (flip) {
      y = r.top + window.scrollY - h - 8
      tip.classList.add('flip')
    }
    tip.style.left = x + 'px'
    tip.style.top = y + 'px'
    var arrowX = Math.max(12, r.left + window.scrollX + r.width / 2 - x - 5)
    tip.style.setProperty('--arrow-x', arrowX + 'px')
  }
  function hideTerm() {
    if (tooltip) tooltip.classList.remove('show')
  }
  document.addEventListener('mouseover', function (e) {
    var term = e.target.closest ? e.target.closest('.term') : null
    if (term) showTerm(term)
  })
  document.addEventListener('mouseout', function (e) {
    if (e.target.closest && e.target.closest('.term')) hideTerm()
  })
  document.addEventListener('click', function (e) {
    var term = e.target.closest ? e.target.closest('.term') : null
    if (term) showTerm(term)
    else hideTerm()
  })
  window.addEventListener('scroll', hideTerm, { passive: true })

  /* ── quiz ──────────────────────────────────────────────── */
  function setFeedback(q, cls, text) {
    var fb = q.querySelector('.quiz-fb')
    fb.className = 'quiz-fb show ' + cls
    fb.textContent = text
  }
  document.addEventListener('click', function (e) {
    var opt = e.target.closest ? e.target.closest('.quiz-opt') : null
    if (opt && !opt.disabled) {
      var quiz = opt.closest('.quiz')
      quiz.querySelectorAll('.quiz-opt').forEach(function (o) {
        o.classList.remove('selected')
      })
      opt.classList.add('selected')
      return
    }
    var check = e.target.closest ? e.target.closest('.quiz-check') : null
    if (check) {
      var q = check.closest('.quiz')
      var selected = q.querySelector('.quiz-opt.selected')
      if (!selected) {
        setFeedback(q, 'warn', '先选择一个答案，再检查。')
        return
      }
      var correct = q.getAttribute('data-correct')
      var right = selected.getAttribute('data-value') === correct
      q.querySelectorAll('.quiz-opt').forEach(function (o) {
        o.disabled = true
        if (o.getAttribute('data-value') === correct) o.classList.add('correct')
      })
      if (!right) selected.classList.add('incorrect')
      selected.classList.remove('selected')
      setFeedback(q, right ? 'success' : 'error', right ? '✔ 回答正确！' + q.getAttribute('data-right') : '✘ 还差一点。' + q.getAttribute('data-wrong'))
      check.hidden = true
      q.querySelector('.quiz-reset').hidden = false
      return
    }
    var reset = e.target.closest ? e.target.closest('.quiz-reset') : null
    if (reset) {
      var q2 = reset.closest('.quiz')
      q2.querySelectorAll('.quiz-opt').forEach(function (o) {
        o.disabled = false
        o.classList.remove('selected', 'correct', 'incorrect')
      })
      var fb = q2.querySelector('.quiz-fb')
      fb.className = 'quiz-fb'
      fb.textContent = ''
      reset.hidden = true
      q2.querySelector('.quiz-check').hidden = false
    }
  })

  /* ── chat ──────────────────────────────────────────────── */
  function chatState(win) {
    return {
      msgs: Array.prototype.slice.call(win.querySelectorAll('.chat-msg')),
      typing: win.querySelector('.chat-typing'),
      next: win.querySelector('.chat-next'),
      all: win.querySelector('.chat-all'),
      replay: win.querySelector('.chat-replay'),
      count: win.querySelector('.chat-count'),
      body: win.querySelector('.chat-body'),
    }
  }
  function chatShown(st) {
    return st.msgs.filter(function (m) {
      return !m.hidden
    }).length
  }
  function chatUpdate(st) {
    var shown = chatShown(st)
    st.count.textContent = shown + ' / ' + st.msgs.length
    var done = shown >= st.msgs.length
    st.next.hidden = done
    st.all.hidden = done
    st.replay.hidden = !done
  }
  function chatRevealOne(st) {
    var nextMsg = st.msgs.find(function (m) {
      return m.hidden
    })
    if (!nextMsg) return
    var who = nextMsg.getAttribute('data-who') || ''
    st.typing.querySelector('.chat-ava').textContent = who.slice(0, 1) || '?'
    st.typing.hidden = false
    st.body.scrollTop = st.body.scrollHeight
    setTimeout(function () {
      st.typing.hidden = true
      nextMsg.hidden = false
      chatUpdate(st)
      st.body.scrollTop = st.body.scrollHeight
    }, 480)
  }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.chat-next, .chat-all, .chat-replay') : null
    if (!btn) return
    var st = chatState(btn.closest('.chat'))
    if (btn.classList.contains('chat-next')) {
      chatRevealOne(st)
    } else if (btn.classList.contains('chat-all')) {
      st.typing.hidden = true
      st.msgs.forEach(function (m) {
        m.hidden = false
      })
      chatUpdate(st)
      st.body.scrollTop = st.body.scrollHeight
    } else {
      st.msgs.forEach(function (m) {
        m.hidden = true
      })
      st.typing.hidden = true
      chatUpdate(st)
    }
  })
  document.querySelectorAll('.chat').forEach(function (win) {
    chatUpdate(chatState(win))
  })

  /* ── flow ──────────────────────────────────────────────── */
  function actorCenter(flow, id) {
    var wrap = flow.querySelector('.flow-actors')
    var actor = wrap.querySelector('[data-actor="' + id + '"]')
    if (!actor) return 0
    return actor.offsetLeft + actor.offsetWidth / 2
  }
  function flowState(flow) {
    return {
      steps: JSON.parse(flow.getAttribute('data-steps') || '[]'),
      idx: 0,
      packet: flow.querySelector('.flow-packet'),
      label: flow.querySelector('.flow-label'),
      next: flow.querySelector('.flow-next'),
      replay: flow.querySelector('.flow-replay'),
      count: flow.querySelector('.flow-count'),
    }
  }
  function flowStep(flow, st) {
    var step = st.steps[st.idx]
    if (!step) return
    flow.querySelectorAll('.flow-actor').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-actor') === step.from)
    })
    st.label.classList.remove('done')
    st.label.textContent = step.label
    if (step.packet) {
      var fromX = actorCenter(flow, step.from) - 7
      var toX = actorCenter(flow, step.to) - 7
      st.packet.hidden = false
      st.packet.style.transition = 'none'
      st.packet.style.transform = 'translateX(' + fromX + 'px)'
      void st.packet.offsetWidth
      st.packet.style.transition = ''
      st.packet.style.transform = 'translateX(' + toX + 'px)'
    } else {
      st.packet.hidden = true
    }
    st.idx++
    st.count.textContent = '步骤 ' + st.idx + ' / ' + st.steps.length
    if (st.idx >= st.steps.length) {
      st.next.hidden = true
      st.replay.hidden = false
      setTimeout(function () {
        flow.querySelectorAll('.flow-actor').forEach(function (a) {
          a.classList.remove('active')
        })
        st.label.textContent = '🎉 演示完成 — ' + step.label
        st.label.classList.add('done')
      }, 800)
    }
  }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.flow-next, .flow-replay') : null
    if (!btn) return
    var flow = btn.closest('.flow')
    var st = flowState(flow)
    if (btn.classList.contains('flow-replay')) {
      flow.querySelectorAll('.flow-actor').forEach(function (a) {
        a.classList.remove('active')
      })
      st.packet.hidden = true
      st.label.classList.remove('done')
      st.label.textContent = '点击「下一步」开始演示'
      st.count.textContent = ''
      btn.hidden = true
      st.next.hidden = false
      return
    }
    flowStep(flow, st)
  })

  /* ── arch diagram ──────────────────────────────────────── */
  document.addEventListener('click', function (e) {
    var node = e.target.closest ? e.target.closest('.arch-node') : null
    if (!node) return
    var arch = node.closest('.arch')
    arch.querySelectorAll('.arch-node').forEach(function (n) {
      n.classList.toggle('active', n === node)
    })
    arch.querySelector('.arch-detail-title').textContent = node.getAttribute('data-label')
    arch.querySelector('.arch-detail-desc').textContent = node.getAttribute('data-desc')
  })
})()
