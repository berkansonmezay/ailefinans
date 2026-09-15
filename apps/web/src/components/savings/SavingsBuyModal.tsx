import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { toast } from 'react-hot-toast';
import { fetchApi } from '@/lib/api';

interface SavingsBuyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialAsset?: any;
}

export function SavingsBuyModal({ isOpen, onClose, onSuccess, initialAsset }: SavingsBuyModalProps) {
  const [loading, setLoading] = useState(false);
  const [marketRates, setMarketRates] = useState<any[]>([]);
  
  const [type, setType] = useState('CURRENCY');
  const [code, setCode] = useState('USD');
  const [bank, setBank] = useState('');
  
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadMarketRates();
      if (initialAsset) {
        setType(initialAsset.type === 'Gold' ? 'GOLD' : 'CURRENCY');
        setCode(initialAsset.code);
        setBank(initialAsset.bank || '');
      } else {
        setType('CURRENCY');
        setCode('USD');
        setBank('');
      }
    }
  }, [isOpen, initialAsset]);

  useEffect(() => {
    // When code/bank changes, update price automatically
    const rate = marketRates.find(r => r.code === code);
    if (rate) {
      setPrice(rate.selling.toString());
    } else {
      setPrice('');
    }
  }, [code, marketRates]);

  const loadMarketRates = async () => {
    try {
      const res = await fetchApi('/market/rates');
      setMarketRates(res?.rates || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await fetchApi('/savings-assets/transaction', {
        method: 'POST',
        body: JSON.stringify({
          code,
          type,
          bank,
          transactionType: 'BUY',
          quantity: parseFloat(quantity),
          price: parseFloat(price),
          date,
          notes
        }),
      });

      toast.success('İşlem başarıyla eklendi');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Filter rates for dropdown
  const currencyOptions = marketRates
    .filter(r => r.type === 'Currency')
    .map(r => ({ value: r.code, label: r.code }));

  const goldOptions = marketRates
    .filter(r => r.type === 'Gold' && r.code !== 'gumus' && r.code !== 'gram-platin' && r.code !== 'gram-paladyum')
    .map(r => ({ value: r.code, label: r.code }));

  const silverOptions = marketRates
    .filter(r => r.type === 'Gold' && (r.code === 'gumus' || r.code === 'gram-platin' || r.code === 'gram-paladyum'))
    .map(r => ({ value: r.code, label: r.code }));

  const getOptions = () => {
    switch (type) {
      case 'CURRENCY': return currencyOptions;
      case 'GOLD': return goldOptions;
      case 'SILVER': return silverOptions;
      default: return [];
    }
  };
  
  const options = getOptions();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Yeni Tasarruf Ekle (Alış)">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Tasarruf Türü"
            value={type}
            onChange={(e) => {
              const newType = e.target.value;
              setType(newType);
              if (newType === 'CURRENCY') setCode('USD');
              else if (newType === 'GOLD') setCode('gram-altin');
              else if (newType === 'SILVER') setCode('gumus');
              else setCode('');
            }}
            options={[
              { value: 'CURRENCY', label: 'Döviz' },
              { value: 'GOLD', label: 'Altın' },
              { value: 'SILVER', label: 'Gümüş & Platin' },
              { value: 'FUND', label: 'Yatırım Fonu' },
            ]}
          />
          {type === 'FUND' ? (
            <Input
              label="Fon Kodu (Örn: AFT)"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              placeholder="Fon Kodu Giriniz"
            />
          ) : (
            <Select
              label="Varlık Seçimi"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              options={options.length > 0 ? options : [{ value: code, label: code }]}
            />
          )}
        </div>

        {code === 'gram-altin' && (
          <Select
            label="Banka / Piyasa Seçimi"
            value={bank}
            onChange={(e) => setBank(e.target.value)}
            options={[
              { value: '', label: 'Serbest Piyasa' },
              { value: 'Ziraat Bankası', label: 'Ziraat Bankası' },
              { value: 'Ziraat Katılım', label: 'Ziraat Katılım' },
              { value: 'Garanti BBVA', label: 'Garanti BBVA' },
              { value: 'İş Bankası', label: 'İş Bankası' },
              { value: 'Akbank', label: 'Akbank' },
              { value: 'Yapı Kredi', label: 'Yapı Kredi' },
              { value: 'Vakıfbank', label: 'Vakıfbank' },
              { value: 'Vakıf Katılım', label: 'Vakıf Katılım' },
              { value: 'Halkbank', label: 'Halkbank' },
              { value: 'Kuveyt Türk', label: 'Kuveyt Türk' },
              { value: 'Türkiye Finans', label: 'Türkiye Finans' },
              { value: 'Albaraka Türk', label: 'Albaraka Türk' },
              { value: 'Emlak Katılım', label: 'Emlak Katılım' },
              { value: 'QNB Finansbank', label: 'QNB Finansbank' },
              { value: 'DenizBank', label: 'DenizBank' },
              { value: 'TEB', label: 'TEB' },
              { value: 'Enpara', label: 'Enpara' },
            ]}
          />
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Miktar"
            type="number"
            step="0.01"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            placeholder="0.00"
          />
          <Input
            label="Alış Fiyatı (₺)"
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            placeholder="0.00"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="İşlem Tarihi"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <Input
            label="Notlar (İsteğe Bağlı)"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Açıklama girin..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
          <Button type="button" variant="ghost" onClick={onClose}>
            İptal
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Ekleniyor...' : 'Ekle'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
