import React, { useState, useEffect } from 'react';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ImageUpload } from '../../components/ImageUpload';
import { useSettings } from '../../SettingsContext';

export default function ContentPage() {
  const { siteContent, refreshContent } = useSettings();
  const [localContent, setLocalContent] = useState<any[]>([]);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  useEffect(() => {
    if (siteContent.length > 0) {
      setLocalContent(siteContent);
    }
  }, [siteContent]);

  const handleUpdateContent = async (id: string, value: string) => {
    try {
      await updateDoc(doc(db, 'siteContent', id), { value });
      await refreshContent(true);
      setStatus({ type: 'success', msg: 'Content updated successfully!' });
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      setStatus({ type: 'error', msg: 'Failed to update content.' });
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const handleAddContent = async (data: any) => {
    try {
      await addDoc(collection(db, 'siteContent'), data);
      await refreshContent(true);
      setStatus({ type: 'success', msg: 'Content added successfully!' });
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      setStatus({ type: 'error', msg: 'Failed to add content.' });
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const content = localContent;
  const setContent = setLocalContent;

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-stone-900">Manage Site Content</h2>
        {status && (
          <div className={`px-4 py-2 rounded-xl text-sm font-bold ${
            status.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
          }`}>
            {status.msg}
          </div>
        )}
      </div>
      
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-stone-900">Logos</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { key: 'college_logo', label: 'Darul Huda Punganur Logo' },
            { key: 'safa_logo', label: 'Safa Logo' },
            { key: 'skillclub_logo', label: 'Skill Club Logo' }
          ].map(logo => {
            const item = content.find(c => c.key === logo.key);
            return (
              <Card key={logo.key} className="p-6 space-y-4">
                <h4 className="font-bold text-stone-900">{logo.label}</h4>
                <ImageUpload
                  label="Upload Logo"
                  onUpload={(base64) => {
                    const newContent = content.map(c => c.key === logo.key ? {...c, value: base64} : c);
                    if (!content.find(c => c.key === logo.key)) {
                      setContent([...content, { key: logo.key, value: base64 } as any]);
                    } else {
                      setContent(newContent);
                    }
                  }}
                  currentImageUrl={item?.value}
                />
                <Button 
                  onClick={() => {
                    const existing = content.find(c => c.key === logo.key);
                    if (existing?.id) {
                      handleUpdateContent(existing.id, existing.value);
                    } else {
                      handleAddContent({ key: logo.key as any, value: item?.value || '' });
                    }
                  }}
                  className="w-full mt-4"
                >
                  Save Logo
                </Button>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-bold text-stone-900">About Sections</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { key: 'about_college', label: 'About Darul Huda Punganur' },
            { key: 'about_safa', label: 'About Safa Union' },
            { key: 'about_skillclub', label: 'About Skill Club' }
          ].map(section => {
            const item = content.find(c => c.key === section.key);
            return (
              <Card key={section.key} className="p-6 space-y-4">
                <h4 className="font-bold text-stone-900">{section.label}</h4>
                <textarea
                  value={item?.value || ''}
                  onChange={(e) => {
                    const newContent = content.map(c => c.key === section.key ? {...c, value: e.target.value} : c);
                    if (!content.find(c => c.key === section.key)) {
                      setContent([...content, { key: section.key, value: e.target.value } as any]);
                    } else {
                      setContent(newContent);
                    }
                  }}
                  className="w-full h-40 p-4 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  placeholder={`Enter ${section.label.toLowerCase()}...`}
                />
                <Button 
                  onClick={() => {
                    const existing = content.find(c => c.key === section.key);
                    if (existing?.id) {
                      handleUpdateContent(existing.id, existing.value);
                    } else {
                      handleAddContent({ key: section.key as any, value: item?.value || '' });
                    }
                  }}
                  className="w-full"
                >
                  Save Section
                </Button>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-bold text-stone-900">Social Media & Contact</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { key: 'social_whatsapp', label: 'WhatsApp Link' },
            { key: 'social_facebook', label: 'Facebook Link' },
            { key: 'social_instagram', label: 'Instagram Link' },
            { key: 'social_gmail', label: 'Gmail Link' },
            { key: 'social_telegram', label: 'Telegram Link' },
            { key: 'social_phone', label: 'Contact Number' }
          ].map(item => {
            const contentItem = content.find(c => c.key === item.key);
            return (
              <Card key={item.key} className="p-6 space-y-4">
                <h4 className="font-bold text-stone-900">{item.label}</h4>
                <input
                  type="text"
                  value={contentItem?.value || ''}
                  onChange={(e) => {
                    const newContent = content.map(c => c.key === item.key ? {...c, value: e.target.value} : c);
                    if (!content.find(c => c.key === item.key)) {
                      setContent([...content, { key: item.key, value: e.target.value } as any]);
                    } else {
                      setContent(newContent);
                    }
                  }}
                  className="w-full p-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder={`Enter ${item.label.toLowerCase()}...`}
                />
                <p className="text-xs text-stone-400">
                  {item.key === 'social_whatsapp' && 'Enter number with country code (e.g., 919876543210) or full URL.'}
                  {item.key === 'social_facebook' && 'Enter username or full URL.'}
                  {item.key === 'social_instagram' && 'Enter username or full URL.'}
                  {item.key === 'social_gmail' && 'Enter email address.'}
                  {item.key === 'social_telegram' && 'Enter username or full URL.'}
                  {item.key === 'social_phone' && 'Enter phone number.'}
                </p>
                <Button 
                  onClick={() => {
                    const existing = content.find(c => c.key === item.key);
                    if (existing?.id) {
                      handleUpdateContent(existing.id, existing.value);
                    } else {
                      handleAddContent({ key: item.key, value: contentItem?.value || '' });
                    }
                  }}
                  className="w-full"
                >
                  Save {item.label}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
