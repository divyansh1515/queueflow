import React, { useEffect, useState } from 'react';
import { Download, Printer, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';
import { qrAPI } from '../../services/api';

export default function AdminQR() {
  const [loading, setLoading] = useState(true);
  const [qr, setQr] = useState(null);

  useEffect(() => {
    loadQR();
  }, []);

  const loadQR = async () => {
    try {
      const res = await qrAPI.generate();

      console.log("QR API Response:", res);

      if (res.data.success) {
        setQr(res.data.data);
      } else {
        toast.error(res.data.message || "Failed to generate QR");
      }

    } catch (err) {
      console.error(err);
      toast.error("Failed to generate QR");
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = async () => {
    try {
      const response = await qrAPI.download();

      const url = window.URL.createObjectURL(new Blob([response.data]));

      const link = document.createElement('a');
      link.href = url;
      link.download = 'queueflow-qr.png';
      link.click();

      toast.success("Downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Download failed");
    }
  };

  if (loading) {
    return (
      <div className="p-10 text-center">
        Loading QR...
      </div>
    );
  }

  if (!qr) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-2xl font-bold text-red-600">
          QR could not be generated
        </h2>

        <p className="mt-4 text-gray-600">
          Check the backend console for errors.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-10">

      <div className="bg-white rounded-3xl shadow-xl p-8 text-center">

        <QrCode className="mx-auto mb-4 text-orange-500" size={48} />

        <h1 className="text-3xl font-bold">
          Customer QR
        </h1>

        <p className="text-gray-500 mt-2">
          Print this QR and place it at your counter.
        </p>

        <div className="mt-8 flex justify-center">
          <img
            src={qr.qrDataUrl}
            alt="QR"
            className="rounded-xl border p-3"
          />
        </div>

        <div className="mt-6">
          <div className="text-sm text-gray-500">
            Customer URL
          </div>

          <div className="font-mono break-all text-blue-600">
            {qr.qrUrl}
          </div>
        </div>

        <div className="flex justify-center gap-4 mt-8">

          <button
            onClick={downloadQR}
            className="px-5 py-3 rounded-xl bg-orange-500 text-white"
          >
            <Download size={18} />
            Download
          </button>

          <button
            onClick={() => window.print()}
            className="px-5 py-3 rounded-xl bg-gray-800 text-white"
          >
            <Printer size={18} />
            Print
          </button>

        </div>

      </div>

    </div>
  );
}