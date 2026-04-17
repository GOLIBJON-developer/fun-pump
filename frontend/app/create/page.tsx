"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useCreateToken, useCreationFee } from "@/hooks/useFactory";
import { uploadImage  } from "@/lib/pinata";

export default function CreatePage() {
  const router              = useRouter();
  const { isConnected }     = useAccount();
  const { data: fee }       = useCreationFee();
  const { create, isPending, isConfirming, isSuccess } = useCreateToken();

  const [form, setForm] = useState({
    name:        "",
    symbol:      "",
    description: "",
  });
  const [imageFile,    setImageFile]    = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploading,    setUploading]    = useState(false);
  const [error,        setError]        = useState("");

  const handleImage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10MB");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError("");
  }, []);

  const handleSubmit = async () => {
    if (!fee) return;
    if (!form.name.trim() || !form.symbol.trim()) {
      setError("Name and symbol are required");
      return;
    }
    if (!imageFile) {
      setError("Please upload an image");
      return;
    }
    setError("");
    try {
      setUploading(true);
      const imageURI = await uploadImage(imageFile);
      setUploading(false);

      await create({
        name:        form.name.trim(),
        symbol:      form.symbol.trim().toUpperCase(),
        imageURI,
        description: form.description.trim(),
        fee,
      });
    } catch (err) {
      setUploading(false);
      setError(err instanceof Error ? err.message.slice(0, 120) : "Transaction failed");
    }
  };

  if (isSuccess) {
    setTimeout(() => router.push("/"), 2000);
  }

  const isLoading = uploading || isPending || isConfirming;
  const feeEth    = fee ? (Number(fee) / 1e18).toFixed(3) : "...";

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">
          <span className="text-[#00ff94]">[</span>
          {" "}launch a new coin{" "}
          <span className="text-[#00ff94]">]</span>
        </h1>
        <p className="text-[#555] text-xs">
          creation fee: {feeEth} ETH — fair launch via bonding curve
        </p>
      </div>

      {!isConnected ? (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-8 text-center">
          <p className="text-[#555] text-sm mb-4">connect wallet to launch</p>
          <ConnectButton />
        </div>
      ) : isSuccess ? (
        <div className="bg-[#111] border border-[#00ff94]/30 rounded-lg p-8 text-center">
          <p className="text-[#00ff94] text-3xl mb-2">✓</p>
          <p className="font-bold mb-1">token launched!</p>
          <p className="text-[#555] text-xs">redirecting...</p>
        </div>
      ) : (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-6 space-y-5">
          {/* Image */}
          <div>
            <label className="text-[11px] text-[#555] block mb-1.5">
              image *
            </label>
            <label className="cursor-pointer block">
              <input
                type="file"
                accept="image/*"
                onChange={handleImage}
                className="hidden"
              />
              <div className="border border-dashed border-[#2a2a2a] rounded-lg hover:border-[#00ff94]/30 transition-colors overflow-hidden">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="preview"
                    className="w-full h-44 object-cover"
                  />
                ) : (
                  <div className="h-44 flex flex-col items-center justify-center text-[#333] gap-2">
                    <span className="text-2xl">+</span>
                    <span className="text-xs">click to upload</span>
                    <span className="text-[10px] text-[#2a2a2a]">
                      PNG/JPG/GIF, max 10MB
                    </span>
                  </div>
                )}
              </div>
            </label>
            <p className="text-[10px] text-[#333] mt-1">
              stored permanently on IPFS via Pinata
            </p>
          </div>

          {/* Name */}
          <div>
            <label className="text-[11px] text-[#555] block mb-1.5">
              name *
            </label>
            <input
              type="text"
              placeholder="Moon Coin"
              value={form.name}
              maxLength={32}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-[#0d0d0d] border border-[#222] rounded px-3 py-2 text-sm text-white placeholder-[#333] focus:border-[#00ff94] transition-colors"
            />
          </div>

          {/* Symbol */}
          <div>
            <label className="text-[11px] text-[#555] block mb-1.5">
              ticker *
            </label>
            <input
              type="text"
              placeholder="MOON"
              value={form.symbol}
              maxLength={8}
              onChange={(e) =>
                setForm({ ...form, symbol: e.target.value.toUpperCase() })
              }
              className="w-full bg-[#0d0d0d] border border-[#222] rounded px-3 py-2 text-sm text-white placeholder-[#333] focus:border-[#00ff94] transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] text-[#555] block mb-1.5">
              description
            </label>
            <textarea
              placeholder="tell people about your token..."
              value={form.description}
              rows={3}
              maxLength={500}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full bg-[#0d0d0d] border border-[#222] rounded px-3 py-2 text-sm text-white placeholder-[#333] resize-none focus:border-[#00ff94] transition-colors"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-[#ff4444] text-xs bg-[#ff4444]/10 border border-[#ff4444]/20 rounded px-3 py-2">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full bg-[#00ff94] text-black font-bold py-3 rounded text-sm hover:bg-[#00cc76] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {uploading
              ? "uploading to IPFS..."
              : isPending
              ? "confirm in wallet..."
              : isConfirming
              ? "confirming..."
              : `launch token — ${feeEth} ETH`}
          </button>
        </div>
      )}
    </div>
  );
}
