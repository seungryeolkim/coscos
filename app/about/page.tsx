"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

const models = [
  {
    name: "Cosmos-Predict2.5",
    variants: ["14B", "2B"],
    descriptionKey: "predict",
    huggingface: "https://huggingface.co/nvidia/Cosmos-Predict2.5-14B",
    github: "https://github.com/nvidia-cosmos/cosmos-predict2.5",
  },
  {
    name: "Cosmos-Transfer2.5",
    variants: ["2B"],
    descriptionKey: "transfer",
    huggingface: "https://huggingface.co/nvidia/Cosmos-Transfer2.5-2B",
    github: "https://github.com/nvidia-cosmos/cosmos-transfer2.5",
  },
  {
    name: "Cosmos-Reason2",
    variants: ["8B"],
    descriptionKey: "reason",
    huggingface: "https://huggingface.co/nvidia/Cosmos-Reason2-8B",
    github: null,
  },
];

const modelDescriptions: Record<string, { ko: string; en: string }> = {
  predict: {
    ko: "Video2World generation - 텍스트/이미지/비디오로부터 미래 상태 예측",
    en: "Video2World generation - predict future states from text/image/video",
  },
  transfer: {
    ko: "Multi-control video generation - 다중 제어 입력 기반 비디오 생성",
    en: "Multi-control video generation - video generation based on multiple control inputs",
  },
  reason: {
    ko: "Video understanding & reasoning - 비디오 이해 및 추론 (VLM)",
    en: "Video understanding & reasoning - video understanding and reasoning (VLM)",
  },
};

export default function AboutPage() {
  const t = useTranslations("about");
  const tLicense = useTranslations("about.license");
  const tImportant = useTranslations("about.important");
  const tEthics = useTranslations("about.ethics");

  const licenseTerms = [
    { termKey: "commercial", noteKey: "commercialNote", allowed: true },
    { termKey: "derivative", noteKey: "derivativeNote", allowed: true },
    { termKey: "sale", noteKey: "saleNote", allowed: true },
    { termKey: "outputOwnership", noteKey: "outputNote", allowed: true },
    { termKey: "safetyGuardrail", noteKey: "safetyNote", allowed: false },
    { termKey: "export", noteKey: "exportNote", allowed: null },
  ];

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      <div className="mb-8">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; {t("backToDashboard")}
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
      <p className="text-muted-foreground mb-8">{t("subtitle")}</p>

      {/* Version Info */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">{t("version")}</h2>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{t("coscosVersion")}:</span>
              <span className="ml-2 font-mono">v0.1.0</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t("cosmosModels")}:</span>
              <span className="ml-2 font-mono">v2.5 / v2.0</span>
            </div>
          </div>
        </div>
      </section>

      {/* Models Used */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">{t("models")}</h2>
        <div className="space-y-4">
          {models.map((model) => (
            <div
              key={model.name}
              className="bg-card border border-border rounded-lg p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold">{model.name}</h3>
                  <span className="text-sm text-muted-foreground">
                    {model.variants.join(" / ")}
                  </span>
                </div>
                <div className="flex gap-2">
                  <a
                    href={model.huggingface}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2 py-1 bg-muted hover:bg-muted/80 rounded transition-colors"
                  >
                    HuggingFace
                  </a>
                  {model.github && (
                    <a
                      href={model.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-2 py-1 bg-muted hover:bg-muted/80 rounded transition-colors"
                    >
                      GitHub
                    </a>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {modelDescriptions[model.descriptionKey].ko}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* License Information */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">{tLicense("title")}</h2>
        <div className="bg-card border border-border rounded-lg p-4 mb-4">
          <p className="text-sm mb-4">
            NVIDIA Cosmos 모델들은{" "}
            <a
              href="https://developer.download.nvidia.com/licenses/nvidia-open-model-license-agreement-june-2024.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline hover:no-underline"
            >
              {tLicense("nvidiaOpen")}
            </a>
            에 따라 라이센스됩니다.
          </p>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-medium">{tLicense("item")}</th>
                <th className="text-center py-2 font-medium w-20">{tLicense("allowed")}</th>
                <th className="text-left py-2 font-medium">{tLicense("notes")}</th>
              </tr>
            </thead>
            <tbody>
              {licenseTerms.map((item) => (
                <tr key={item.termKey} className="border-b border-border/50">
                  <td className="py-2">{tLicense(item.termKey)}</td>
                  <td className="py-2 text-center">
                    {item.allowed === true && (
                      <span className="text-green-500">O</span>
                    )}
                    {item.allowed === false && (
                      <span className="text-red-500">X</span>
                    )}
                    {item.allowed === null && (
                      <span className="text-yellow-500">-</span>
                    )}
                  </td>
                  <td className="py-2 text-muted-foreground">{tLicense(item.noteKey)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-600 dark:text-yellow-400 mb-2">
            {tImportant("title")}
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>- {tImportant("guardrail")}</li>
            <li>- {tImportant("responsibility")}</li>
            <li>- {tImportant("compliance")}</li>
          </ul>
        </div>
      </section>

      {/* AI Ethics */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">{tEthics("title")}</h2>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-3">
            {tEthics("description")}
          </p>
          <a
            href="https://www.nvidia.com/en-us/agreements/trustworthy-ai/terms/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-foreground underline hover:no-underline"
          >
            NVIDIA Trustworthy AI Terms &rarr;
          </a>
        </div>
      </section>

      {/* Attribution */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">{t("attribution")}</h2>
        <div className="bg-muted/50 border border-border rounded-lg p-4 font-mono text-sm">
          <p className="mb-2">Licensed by NVIDIA Corporation under the NVIDIA Open Model License.</p>
          <p className="text-muted-foreground">
            Models: Cosmos-Predict2.5, Cosmos-Transfer2.5, Cosmos-Reason2
          </p>
        </div>
      </section>

      {/* Links */}
      <section>
        <h2 className="text-xl font-semibold mb-4">{t("externalLinks")}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a
            href="https://www.nvidia.com/en-us/ai/cosmos/"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-card border border-border rounded-lg p-4 text-center hover:bg-muted/50 transition-colors"
          >
            <div className="font-semibold mb-1">NVIDIA Cosmos</div>
            <div className="text-xs text-muted-foreground">{t("officialSite")}</div>
          </a>
          <a
            href="https://github.com/nvidia-cosmos"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-card border border-border rounded-lg p-4 text-center hover:bg-muted/50 transition-colors"
          >
            <div className="font-semibold mb-1">GitHub</div>
            <div className="text-xs text-muted-foreground">{t("sourceCode")}</div>
          </a>
          <a
            href="https://huggingface.co/nvidia"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-card border border-border rounded-lg p-4 text-center hover:bg-muted/50 transition-colors"
          >
            <div className="font-semibold mb-1">HuggingFace</div>
            <div className="text-xs text-muted-foreground">{t("modelWeights")}</div>
          </a>
          <a
            href="https://developer.download.nvidia.com/licenses/nvidia-open-model-license-agreement-june-2024.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-card border border-border rounded-lg p-4 text-center hover:bg-muted/50 transition-colors"
          >
            <div className="font-semibold mb-1">License</div>
            <div className="text-xs text-muted-foreground">{t("fullText")}</div>
          </a>
        </div>
      </section>
    </div>
  );
}
