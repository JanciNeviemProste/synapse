/**
 * Kanban Board — Drag & Drop
 * Vanilla JS implementation for moving lead cards between status columns.
 * Columns must carry a data-status attribute with one of:
 *   NEW | CONTACTED | REPLIED | QUALIFIED | CONVERTED
 */
(function () {
  'use strict';

  // ── Selectors ──────────────────────────────────────────────────────────
  const COLUMN_SELECTOR = '[data-status]';
  const CARD_SELECTOR   = '.kanban-card';

  // ── State ──────────────────────────────────────────────────────────────
  let draggedCard = null;
  let ghostCard   = null;
  let sourceColumn = null;

  // ── Helpers ────────────────────────────────────────────────────────────

  function getCardId(card) {
    return card.dataset.id || card.getAttribute('data-lead-id');
  }

  function createGhost(card) {
    const ghost = card.cloneNode(true);
    ghost.classList.add('kanban-ghost');
    ghost.style.opacity = '0.45';
    ghost.style.pointerEvents = 'none';
    ghost.style.position = 'absolute';
    ghost.style.zIndex = '1000';
    ghost.style.width = card.offsetWidth + 'px';
    ghost.style.transform = 'rotate(2deg)';
    document.body.appendChild(ghost);
    return ghost;
  }

  function removeGhost() {
    if (ghostCard) {
      ghostCard.remove();
      ghostCard = null;
    }
  }

  function highlightColumn(column) {
    column.classList.add('kanban-drop-highlight');
  }

  function unhighlightAllColumns() {
    document.querySelectorAll(COLUMN_SELECTOR).forEach(function (col) {
      col.classList.remove('kanban-drop-highlight');
    });
  }

  function closestDropTarget(el) {
    while (el && !el.matches(COLUMN_SELECTOR)) {
      el = el.parentElement;
    }
    return el;
  }

  // ── API ────────────────────────────────────────────────────────────────

  function updateLeadStatus(leadId, newStatus) {
    return fetch('/api/leads/' + encodeURIComponent(leadId) + '/status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    }).then(function (res) {
      if (!res.ok) {
        throw new Error('Failed to update status: ' + res.status);
      }
      return res.json();
    });
  }

  // ── Drag Events (Card) ─────────────────────────────────────────────────

  function onDragStart(e) {
    draggedCard = e.target.closest(CARD_SELECTOR);
    if (!draggedCard) return;

    sourceColumn = draggedCard.closest(COLUMN_SELECTOR);

    // Allow the move effect
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', getCardId(draggedCard));

    // Create visual ghost
    ghostCard = createGhost(draggedCard);

    // Use a transparent 1×1 image so the default ghost is invisible
    var blank = document.createElement('canvas');
    blank.width = 1;
    blank.height = 1;
    e.dataTransfer.setDragImage(blank, 0, 0);

    // Fade the original card
    requestAnimationFrame(function () {
      draggedCard.classList.add('kanban-dragging');
    });
  }

  function onDrag(e) {
    if (!ghostCard) return;
    ghostCard.style.left = e.pageX + 12 + 'px';
    ghostCard.style.top  = e.pageY + 12 + 'px';
  }

  function onDragEnd() {
    if (draggedCard) {
      draggedCard.classList.remove('kanban-dragging');
    }
    removeGhost();
    unhighlightAllColumns();
    draggedCard = null;
    sourceColumn = null;
  }

  // ── Drop Events (Column) ──────────────────────────────────────────────

  function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    var column = closestDropTarget(e.target);
    if (column) {
      unhighlightAllColumns();
      highlightColumn(column);
    }
  }

  function onDragEnter(e) {
    e.preventDefault();
    var column = closestDropTarget(e.target);
    if (column) {
      highlightColumn(column);
    }
  }

  function onDragLeave(e) {
    var column = closestDropTarget(e.target);
    if (column && !column.contains(e.relatedTarget)) {
      column.classList.remove('kanban-drop-highlight');
    }
  }

  function onDrop(e) {
    e.preventDefault();
    unhighlightAllColumns();

    var targetColumn = closestDropTarget(e.target);
    if (!targetColumn || !draggedCard) return;

    var newStatus = targetColumn.dataset.status;
    var leadId    = getCardId(draggedCard);

    // Don't do anything if dropped on the same column
    if (targetColumn === sourceColumn) return;

    // Move the card in the DOM
    var cardList = targetColumn.querySelector('.kanban-cards') || targetColumn;
    cardList.appendChild(draggedCard);

    // Persist the change
    updateLeadStatus(leadId, newStatus).catch(function (err) {
      console.error('[Kanban] Status update failed, reverting.', err);
      // Revert on failure
      var srcList = sourceColumn.querySelector('.kanban-cards') || sourceColumn;
      srcList.appendChild(draggedCard);
    });
  }

  // ── Initialisation ────────────────────────────────────────────────────

  function init() {
    // Make all current (and future) cards draggable
    document.querySelectorAll(CARD_SELECTOR).forEach(function (card) {
      card.setAttribute('draggable', 'true');
    });

    // Delegate card drag events from document
    document.addEventListener('dragstart', function (e) {
      if (e.target.closest(CARD_SELECTOR)) onDragStart(e);
    });
    document.addEventListener('drag', onDrag);
    document.addEventListener('dragend', onDragEnd);

    // Column drop-zone events
    document.querySelectorAll(COLUMN_SELECTOR).forEach(function (col) {
      col.addEventListener('dragover',  onDragOver);
      col.addEventListener('dragenter', onDragEnter);
      col.addEventListener('dragleave', onDragLeave);
      col.addEventListener('drop',      onDrop);
    });

    // Observe DOM for dynamically added cards (e.g. after AJAX load)
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          if (node.matches && node.matches(CARD_SELECTOR)) {
            node.setAttribute('draggable', 'true');
          }
          if (node.querySelectorAll) {
            node.querySelectorAll(CARD_SELECTOR).forEach(function (c) {
              c.setAttribute('draggable', 'true');
            });
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
