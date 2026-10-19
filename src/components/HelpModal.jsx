import React, { useState, useMemo } from 'react';
import { Modal, Form, Badge } from 'react-bootstrap';
import helpSections from '../data/help-sections.json';

export default function HelpModal({ show, onHide }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = useMemo(() => {
    const set = new Set(helpSections.map((s) => s.category));
    return ['All', ...Array.from(set)];
  }, []);

  const filteredSections = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return helpSections.filter((sec) => {
      const matchesCategory = selectedCategory === 'All' || sec.category === selectedCategory;
      if (!matchesCategory) return false;
      if (!q) return true;

      const titleMatch = sec.title.toLowerCase().includes(q);
      const descMatch = sec.description.toLowerCase().includes(q);
      const catMatch = sec.category.toLowerCase().includes(q);
      const stepsMatch = sec.steps.some((step) => step.toLowerCase().includes(q));

      return titleMatch || descMatch || catMatch || stepsMatch;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      centered
      scrollable
      data-bs-theme="dark"
      className="help-modal"
    >
      <Modal.Body className="p-0 text-light d-flex flex-column" style={{ maxHeight: '85vh' }}>
        {/* TOP SEARCH & FILTER BAR */}
        <div className="p-3 border-bottom border-secondary border-opacity-25 bg-black bg-opacity-40">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <div className="d-flex align-items-center gap-2">
              <span className="material-symbols-rounded text-info fs-4">menu_book</span>
              <span className="fw-bold fs-5 text-light">AI vs AI Pokémon Showdown Manual</span>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary border-0 p-1 rounded-circle"
              onClick={onHide}
              aria-label="Close"
            >
              <span className="material-symbols-rounded fs-5">close</span>
            </button>
          </div>

          <div className="position-relative mb-2">
            <Form.Control
              type="text"
              placeholder="Search guide, mechanics, commands, or models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-dark text-light border-secondary border-opacity-50 ps-4 font-monospace small"
            />
          </div>

          <div className="d-flex flex-wrap gap-1">
            {categories.map((cat) => (
              <Badge
                key={cat}
                bg={selectedCategory === cat ? 'info' : 'dark'}
                className="cursor-pointer border border-secondary border-opacity-25 py-1 px-2 font-monospace small"
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>
        </div>

        {/* CONTENT SECTIONS */}
        <div className="p-3 overflow-y-auto d-flex flex-column gap-3">
          {filteredSections.length === 0 ? (
            <div className="text-secondary text-center py-5 fst-italic">
              No matching guide sections found for "{searchQuery}".
            </div>
          ) : (
            filteredSections.map((sec) => (
              <div
                key={sec.id}
                id={sec.id}
                className="p-3 rounded bg-dark bg-opacity-50 border border-secondary border-opacity-15"
              >
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <h6 className="fw-bold text-info mb-0">{sec.title}</h6>
                  <span className="badge bg-secondary bg-opacity-25 text-secondary font-monospace" style={{ fontSize: '0.65rem' }}>
                    {sec.category}
                  </span>
                </div>

                <p className="text-secondary small mb-2">{sec.description}</p>

                {sec.steps && sec.steps.length > 0 && (
                  <div className="p-2 rounded bg-dark bg-opacity-40 border border-secondary border-opacity-10">
                    <div className="fw-semibold text-light small mb-1">{sec.stepsTitle || 'Instructions'}:</div>
                    <ul className="mb-0 ps-3 small text-secondary">
                      {sec.steps.map((st, sIdx) => (
                        <li key={sIdx} className="mb-1">{st}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Modal.Body>
    </Modal>
  );
}
