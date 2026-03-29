/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Upload, 
  Copy, 
  Check, 
  FileText, 
  User, 
  Calendar, 
  MapPin, 
  Shield, 
  IndianRupee, 
  Phone,
  MessageSquare,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ExtractedData {
  name: string;
  dob: string;
  gender: string;
  isSmoker: string;
  planCode: string;
  nominee: string;
  sumInsured: string;
  city: string;
  cityTier: string;
  mobile: string;
}

interface ValidationErrors {
  dob?: string;
  mobile?: string;
  sumInsured?: string;
}

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [data, setData] = useState<ExtractedData | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

  const validateData = (newData: ExtractedData) => {
    const newErrors: ValidationErrors = {};
    
    // DOB: Exactly 8 digits (DDMMYYYY)
    if (!/^\d{8}$/.test(newData.dob)) {
      newErrors.dob = "Format must be DDMMYYYY (8 digits)";
    }

    // Mobile: Exactly 10 digits
    if (!/^\d{10}$/.test(newData.mobile.replace(/\s/g, ''))) {
      newErrors.mobile = "Mobile must be exactly 10 digits";
    }

    // Sum Insured: Valid numerical amount
    const numericSum = newData.sumInsured.replace(/[^0-9.]/g, '');
    if (!numericSum || isNaN(Number(numericSum))) {
      newErrors.sumInsured = "Invalid numerical amount";
    }

    setErrors(newErrors);
  };

  const handleFieldChange = (field: keyof ExtractedData, value: string) => {
    if (!data) return;
    const updatedData = { ...data, [field]: value };
    setData(updatedData);
    validateData(updatedData);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        processImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (base64Data: string) => {
    setIsProcessing(true);
    setData(null);
    setErrors({});
    
    try {
      const base64Content = base64Data.split(',')[1];
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: `OCR Task: Extract insurance form data from this image. 
              Transformation Rules:
              1. Convert all dates (DOB) to 'DDMMYYYY' format (e.g., 5th March 1990 -> 05031990).
              2. Convert medical history/smoker status to "YES" or "NO".
              3. Identify Gender as "M", "F", or "O".
              4. For City, determine Tier: "Tier 1" (Delhi NCR, Mumbai, Thane, Navi Mumbai, Surat, Ahmedabad, Vadodara, Pune, Kolkata, Hyderabad, Chennai, Bengaluru) or "Tier 2" (Rest of India).
              5. Map Plan to a code like "REASSURE_2.0" if mentioned.
              
              Fields: name, dob, gender, isSmoker, planCode, nominee, sumInsured, city, cityTier, mobile.
              Return strictly JSON.` },
              { inlineData: { mimeType: "image/jpeg", data: base64Content } }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              dob: { type: Type.STRING },
              gender: { type: Type.STRING },
              isSmoker: { type: Type.STRING },
              planCode: { type: Type.STRING },
              nominee: { type: Type.STRING },
              sumInsured: { type: Type.STRING },
              city: { type: Type.STRING },
              cityTier: { type: Type.STRING },
              mobile: { type: Type.STRING },
            },
            required: ["name", "dob", "gender", "isSmoker", "planCode", "nominee", "sumInsured", "city", "cityTier", "mobile"]
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      setData(result);
      validateData(result);
    } catch (error) {
      console.error("Extraction failed:", error);
      alert("Failed to extract data. Please try a clearer image.");
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getDashboardSummary = () => {
    if (!data) return "";
    return `Name: ${data.name} | DOB: ${data.dob} | Sum: ${data.sumInsured}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield className="text-white w-5 h-5" />
            </div>
            <h1 className="font-bold text-lg tracking-tight">Niva Bupa <span className="text-blue-600">Form-Filler</span></h1>
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            New Scan
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-8">
        {/* Upload Section */}
        {!image && !isProcessing && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Upload className="text-blue-600 w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold mb-2">Upload Lead Diary</h2>
            <p className="text-slate-500 max-w-xs">Scan handwritten notes for automatic form formatting.</p>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileUpload}
            />
          </motion.div>
        )}

        {/* Processing State */}
        {isProcessing && (
          <div className="bg-white rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-sm border border-slate-200">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <h2 className="text-xl font-bold mb-2">Formatting Data...</h2>
            <p className="text-slate-500">Converting dates and mapping tiers.</p>
          </div>
        )}

        {/* Results Section */}
        <AnimatePresence>
          {data && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              {/* Image Preview */}
              {image && (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white p-2">
                  <img src={image} alt="Diary Preview" className="w-full h-48 object-cover rounded-xl opacity-50 grayscale" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2 shadow-sm border border-slate-200">
                      <ImageIcon className="w-4 h-4 text-slate-500" />
                      <span className="text-xs font-medium text-slate-600 uppercase tracking-wider">Reference Image</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Data Grid */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Form-Ready Fields
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Niva Bupa Format</span>
                </div>
                
                <div className="divide-y divide-slate-100">
                  <DataRow 
                    label="[DATE OF BIRTH]" 
                    value={data.dob} 
                    error={errors.dob}
                    icon={<Calendar className="w-4 h-4" />} 
                    onCopy={() => copyToClipboard(data.dob, 'dob')}
                    onChange={(val) => handleFieldChange('dob', val)}
                    isCopied={copiedField === 'dob'}
                    subLabel="DDMMYYYY"
                  />
                  <DataRow 
                    label="[NAME]" 
                    value={data.name} 
                    icon={<User className="w-4 h-4" />} 
                    onCopy={() => copyToClipboard(data.name, 'name')}
                    onChange={(val) => handleFieldChange('name', val)}
                    isCopied={copiedField === 'name'}
                  />
                  <DataRow 
                    label="[GENDER]" 
                    value={data.gender} 
                    icon={<User className="w-4 h-4" />} 
                    onCopy={() => copyToClipboard(data.gender, 'gender')}
                    onChange={(val) => handleFieldChange('gender', val)}
                    isCopied={copiedField === 'gender'}
                    subLabel="M/F/O"
                  />
                  <DataRow 
                    label="[SMOKER?]" 
                    value={data.isSmoker} 
                    icon={<Shield className="w-4 h-4" />} 
                    onCopy={() => copyToClipboard(data.isSmoker, 'isSmoker')}
                    onChange={(val) => handleFieldChange('isSmoker', val)}
                    isCopied={copiedField === 'isSmoker'}
                    subLabel="YES/NO"
                  />
                  <DataRow 
                    label="[PLAN CODE]" 
                    value={data.planCode} 
                    icon={<Shield className="w-4 h-4" />} 
                    onCopy={() => copyToClipboard(data.planCode, 'planCode')}
                    onChange={(val) => handleFieldChange('planCode', val)}
                    isCopied={copiedField === 'planCode'}
                  />
                  <DataRow 
                    label="[NOMINEE]" 
                    value={data.nominee} 
                    icon={<User className="w-4 h-4" />} 
                    onCopy={() => copyToClipboard(data.nominee, 'nominee')}
                    onChange={(val) => handleFieldChange('nominee', val)}
                    isCopied={copiedField === 'nominee'}
                  />
                  <DataRow 
                    label="CITY TIER" 
                    value={data.cityTier} 
                    icon={<MapPin className="w-4 h-4" />} 
                    onCopy={() => copyToClipboard(data.cityTier, 'cityTier')}
                    onChange={(val) => handleFieldChange('cityTier', val)}
                    isCopied={copiedField === 'cityTier'}
                    subLabel={data.city}
                  />
                </div>
              </div>

              {/* Dashboard Summary */}
              <div className="bg-slate-800 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-400" />
                    <h3 className="font-bold">Dashboard Summary</h3>
                  </div>
                  <button 
                    onClick={() => copyToClipboard(getDashboardSummary(), 'summary')}
                    className="bg-white/10 hover:bg-white/20 transition-colors p-2 rounded-lg"
                  >
                    {copiedField === 'summary' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="bg-slate-900 rounded-xl p-4 font-mono text-sm border border-slate-700">
                  {getDashboardSummary()}
                </div>
                <p className="text-[10px] mt-3 opacity-50 uppercase tracking-widest font-bold">Copy-Paste Ready</p>
              </div>

              {/* Reset Button */}
              <button 
                onClick={() => {
                  setImage(null);
                  setData(null);
                  setErrors({});
                }}
                className="w-full py-4 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-100 transition-colors"
              >
                Clear and Scan Another
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleFileUpload}
      />
    </div>
  );
}

function DataRow({ label, value, icon, onCopy, onChange, isCopied, error, subLabel }: { 
  label: string, 
  value: string, 
  icon: React.ReactNode, 
  onCopy: () => void,
  onChange: (val: string) => void,
  isCopied: boolean,
  error?: string,
  subLabel?: string
}) {
  return (
    <div className={`flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors group ${error ? 'bg-red-50/30' : ''}`}>
      <div className="flex items-center gap-4 flex-1">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
          error ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600'
        }`}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
              {label} {subLabel && <span className="text-blue-500/60 lowercase font-normal ml-1">({subLabel})</span>}
            </p>
            {error && (
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                • {error}
              </span>
            )}
          </div>
          <input 
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full font-bold text-slate-800 bg-transparent border-none focus:ring-0 p-0 selection:bg-blue-100 ${error ? 'text-red-600' : ''}`}
          />
        </div>
      </div>
      <button 
        onClick={onCopy}
        className={`p-2.5 rounded-xl transition-all ml-4 ${
          isCopied 
            ? 'bg-green-100 text-green-600' 
            : 'bg-slate-100 text-slate-400 hover:bg-blue-100 hover:text-blue-600'
        }`}
      >
        {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}
