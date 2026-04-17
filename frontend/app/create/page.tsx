"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useCreateToken, useCreationFee } from "@/hooks/useFactory";
import { uploadImage } from "@/lib/pinata";

export default function CreatePage() {
  const router = useRouter();
  const { isConnected } = useAccount();

  const { data: fee }                    = useCreationFee();
  const { create, isPending, isSuccess, isConfirming } = useCreateToken();

  const [form, setForm] = useState({
    name:        "",
    symbol:      "",
    description: "",
  });
  const [imageFile,    setImageFile]    = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploading,    setUploading]    = useState(false);
  const [error,        setError]        = useState<string>("");

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
    if (!form.name || !form.symbol) {
      setError("Name and symbol are required");
      return;
    }
    if (!imageFile) {
      setError("Please upload an image");
      return;
    }

    setError("");

    try {
      // 1. Upload image to IPFS
      setUploading(true);
      const imageURI = await uploadImage(imageFile);
      setUploading(false);

      // 2. Create token on-chain
      await create({
        name:        form.name,
        symbol:      form.symbol.toUpperCase(),
        imageURI,
        description: form.description,
        fee,
      });
    } catch (err: unknown) {
      setUploading(false);
      setError(err instanceof Error ? err.message : "Transaction failed");
    }
  };

  // Redirect after success
  if (isSuccess) {
    setTimeout(() => router.push("/"), 2000);
  }

  const isLoading = uploading || isPending || isConfirming;

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">
          <span className="text-[#00ff94]">[</span> launch a new coin{" "}
          <span className="text-[#00ff94]">]</span>
        </h1>
        <p className="text-[#555] text-sm font-mono">
          fair launch via bonding curve. fee: {fee ? Number(fee) / 1e18 : "..."} ETH
        </p>
      </div>

      {!isConnected ? (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-8 text-center">
          <p className="text-[#666] mb-4 font-mono text-sm">connect wallet to launch</p>
          <ConnectButton />
        </div>
      ) : isSuccess ? (
        <div className="bg-[#111] border border-[#00ff94]/30 rounded-lg p-8 text-center">
          <div className="text-[#00ff94] text-4xl mb-3">✓</div>
          <p className="text-white font-bold mb-1">token launched!</p>
          <p className="text-[#666] text-sm font-mono">redirecting to home...</p>
        </div>
      ) : (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-6 space-y-5">
          {/* Image upload */}
          <div>
            <label className="text-xs font-mono text-[#666] block mb-2">
              token image *
            </label>
            <label className="cursor-pointer block">
              <input
                type="file"
                accept="image/*"
                onChange={handleImage}
                className="hidden"
              />
              <div className="border border-dashed border-[#2a2a2a] rounded-lg hover:border-[#00ff94]/40 transition-colors overflow-hidden">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="preview"
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="h-48 flex flex-col items-center justify-center text-[#444] gap-2">
                    <span className="text-3xl">+</span>
                    <span className="text-xs font-mono">click to upload image</span>
                    <span className="text-[10px] text-[#333]">PNG/JPG/GIF, max 10MB</span>
                  </div>
                )}
              </div>
            </label>
            <p className="text-[10px] text-[#444] mt-1 font-mono">
              stored on IPFS via Pinata → permanent, decentralized
            </p>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-mono text-[#666] block mb-2">
              name *
            </label>
            <input
              type="text"
              placeholder="e.g. Moon Coin"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              maxLength={32}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white placeholder-[#333] focus:border-[#00ff94] transition-colors"
            />
          </div>

          {/* Symbol */}
          <div>
            <label className="text-xs font-mono text-[#666] block mb-2">
              ticker *
            </label>
            <input
              type="text"
              placeholder="e.g. MOON"
              value={form.symbol}
              onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
              maxLength={8}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white placeholder-[#333] focus:border-[#00ff94] transition-colors font-mono"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-mono text-[#666] block mb-2">
              description
            </label>
            <textarea
              placeholder="tell people about your token..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              maxLength={500}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white placeholder-[#333] resize-none focus:border-[#00ff94] transition-colors"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-[#ff4444] text-xs font-mono bg-[#ff4444]/10 border border-[#ff4444]/20 rounded px-3 py-2">
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
              ? "uploading image to IPFS..."
              : isPending
              ? "confirm in wallet..."
              : isConfirming
              ? "confirming on-chain..."
              : `launch token (${fee ? Number(fee) / 1e18 : "?"} ETH)`}
          </button>
        </div>
      )}
    </div>
  );
}