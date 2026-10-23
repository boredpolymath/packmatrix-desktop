import React, { useState } from 'react';
import type { TripPlan, LuggageShell, UnitSystem } from '../../types';
import { Plane, X, MapPin } from 'lucide-react';
import { format3D } from '../../utils/units';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreateTrip: (trip: TripPlan) => void;
  bags: LuggageShell[];
  activeBagId: string;
  unitSystem?: UnitSystem;
}

export const NewTripModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onCreateTrip,
  bags,
  activeBagId,
  unitSystem = 'metric',
}) => {
  const [title, setTitle] = useState('');
  const [origin, setOrigin] = useState('SFO');
  const [destination, setDestination] = useState('HND');
  const [departureDate, setDepartureDate] = useState('2026-11-10');
  const [returnDate, setReturnDate] = useState('2026-11-25');
  const [selectedBagId, setSelectedBagId] = useState(activeBagId);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTrip: TripPlan = {
      id: `trip-${Date.now()}`,
      title: title.trim(),
      origin_airport: origin.trim().toUpperCase(),
      destination_airport: destination.trim().toUpperCase(),
      departure_date: departureDate,
      return_date: returnDate || undefined,
      active_luggage_shell_id: selectedBagId || undefined,
      notes: notes.trim() || undefined,
    };

    onCreateTrip(newTrip);
    onClose();
    setTitle('');
    setNotes('');
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid var(--border-medium)',
          width: '560px',
          maxWidth: '92vw',
          padding: '1.75rem',
          boxShadow: 'var(--shadow-modal)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plane size={18} color="var(--primary-accent)" />
              <span>Create New Trip Plan</span>
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Setup an independent trip itinerary with dedicated luggage selection and packing items
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '4px' }}>
              Trip Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Tokyo &amp; Kyoto Autumn One-Bag"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem',
                borderRadius: '6px',
                border: '1px solid var(--border-medium)',
                fontSize: '13px',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '3px' }}>
                Origin Airport (IATA)
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <MapPin size={13} style={{ position: 'absolute', left: '8px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  required
                  maxLength={4}
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.5rem 0.5rem 1.8rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-medium)',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '3px' }}>
                Destination Airport (IATA)
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <MapPin size={13} style={{ position: 'absolute', left: '8px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  required
                  maxLength={4}
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.5rem 0.5rem 1.8rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-medium)',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '3px' }}>
                Departure Date
              </label>
              <input
                type="date"
                required
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-medium)',
                  fontSize: '12px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '3px' }}>
                Return Date
              </label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-medium)',
                  fontSize: '12px',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '3px' }}>
              Select Active Luggage Shell for this Trip
            </label>
            <select
              value={selectedBagId}
              onChange={(e) => setSelectedBagId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem',
                borderRadius: '6px',
                border: '1px solid var(--border-medium)',
                fontSize: '12.5px',
                fontWeight: 600,
              }}
            >
              {bags.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.nominal_volume_l}L · {format3D(b.length_cm, b.width_cm, b.depth_cm, unitSystem)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '3px' }}>
              Notes / Itinerary Details
            </label>
            <textarea
              rows={2}
              placeholder="e.g. High mobility one-bag setup; flying ANA economy"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid var(--border-medium)',
                fontSize: '12px',
                resize: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: '6px',
                background: '#ffffff',
                border: '1px solid var(--border-medium)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '0.55rem 1.25rem',
                borderRadius: '6px',
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Create Trip Plan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
