'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { toast } from 'react-hot-toast';
import { fetchApi } from '@/lib/api';

interface CryptoBuyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialSymbol?: string;
}

export function CryptoBuyModal({ isOpen, onClose, onSuccess, initialSymbol = '' }: CryptoBuyModalProps) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState(initialSymbol);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const skipSearchRef = useRef(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const results = await fetchApi<any[]>(`/crypto/search?q=${searchQuery}`);
        setSearchResults(results || []);
        setShowDropdown(true);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectCrypto = async (selectedSymbol: string) => {
    let finalSymbol = selectedSymbol.toUpperCase();
    skipSearchRef.current = true;
    setSymbol(finalSymbol);
    setSearchQuery(finalSymbol);
    setShowDropdown(false);

    // Fetch the current price
    try {
      const quote = await fetchApi<any>(`/crypto/${finalSymbol}/quote`);
      if (quote && quote.regularMarketPrice) {
        setPrice(quote.regularMarketPrice.toString());
      }
    } catch (error) {
      console.error('Failed to fetch quote:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !quantity || !price || !date) {
      toast.error('Lütfen zorunlu alanları doldurun.');
      return;
    }

    try {
      setIsSubmitting(true);
      
      let finalSymbol = symbol.trim();
      if (!finalSymbol.includes('.')) {
        
      }

      await fetchApi('/crypto/buy', {
        method: 'POST',
        body: JSON.stringify({
          symbol: finalSymbol,
          quantity: parseFloat(quantity),
          price: parseFloat(price),
          date,
          notes,
        }),
      });

      toast.success('Kripto alımı başarıyla kaydedildi.');
      onSuccess();
      onClose();
      
      setSymbol('');
      setSearchQuery('');
      setQuantity('');
      setPrice('');
      setNotes('');
    } catch (error: any) {
      toast.error(error.message || 'Alım kaydedilirken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Kripto Alımı Ekle">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative" ref={dropdownRef}>
          <label className="block text-sm font-medium text-text-muted mb-1">
            Kripto Kodu (Örn: THYAO) <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value.toUpperCase());
              setSymbol(e.target.value.toUpperCase());
              setShowDropdown(true);
            }}
            onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
            className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-2 text-text-primary focus:outline-none focus:border-accent"
            placeholder="THYAO"
            required
            autoComplete="off"
          />
          {showDropdown && (searchQuery.length >= 2) && (
            <div className="absolute z-10 w-full mt-1 bg-bg-card border border-border rounded-xl shadow-lg max-h-60 overflow-auto">
              {isSearching ? (
                <div className="p-3 text-sm text-text-muted text-center">Aranıyor...</div>
              ) : searchResults.length > 0 ? (
                <ul className="py-1">
                  {searchResults.map((result, idx) => (
                    <li 
                      key={idx} 
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevents input blur
                        handleSelectCrypto(result.symbol);
                      }}
                      className="px-4 py-2 hover:bg-bg-secondary cursor-pointer flex justify-between items-center transition-colors"
                    >
                      <span className="font-bold text-text-primary">{result.symbol}</span>
                      <span className="text-xs text-text-muted truncate max-w-[200px] ml-2">{result.shortname || result.longname}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-3 text-sm text-text-muted text-center">Sonuç bulunamadı</div>
              )}
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">
              Lot Sayısı <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-2 text-text-primary focus:outline-none focus:border-accent"
              placeholder="100"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">
              Alış Fiyatı (₺) <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-2 text-text-primary focus:outline-none focus:border-accent"
              placeholder="300.50"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-muted mb-1">
            Tarih <span className="text-danger">*</span>
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-2 text-text-primary focus:outline-none focus:border-accent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-muted mb-1">Notlar (Opsiyonel)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-2 text-text-primary focus:outline-none focus:border-accent"
            placeholder="Aracı kurum vs."
          />
        </div>

        {quantity && price && (
           <div className="p-3 bg-bg-secondary/50 rounded-xl border border-border flex justify-between items-center">
             <span className="text-sm text-text-muted">Toplam Tutar:</span>
             <span className="font-bold text-text-primary">
               {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(parseFloat(quantity) * parseFloat(price))}
             </span>
           </div>
        )}

        <div className="flex justify-end gap-3 pt-2 mt-6">
          <Button type="button" variant="ghost" onClick={onClose}>İptal</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
