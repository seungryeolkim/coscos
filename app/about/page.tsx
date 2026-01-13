"use client";

import Link from "next/link";

const models = [
  {
    name: "Cosmos-Predict2.5",
    variants: ["14B", "2B"],
    description: "Video2World generation - 텍스트/이미지/비디오로부터 미래 상태 예측",
    huggingface: "https://huggingface.co/nvidia/Cosmos-Predict2.5-14B",
    github: "https://github.com/nvidia-cosmos/cosmos-predict2.5",
  },
  {
    name: "Cosmos-Transfer2.5",
    variants: ["2B"],
    description: "Multi-control video generation - 다중 제어 입력 기반 비디오 생성",
    huggingface: "https://huggingface.co/nvidia/Cosmos-Transfer2.5-2B",
    github: "https://github.com/nvidia-cosmos/cosmos-transfer2.5",
  },
  {
    name: "Cosmos-Reason2",
    variants: ["8B"],
    description: "Video understanding & reasoning - 비디오 이해 및 추론 (VLM)",
    huggingface: "https://huggingface.co/nvidia/Cosmos-Reason2-8B",
    github: null,
  },
];

const licenseTerms = [
  { term: "상업적 사용", allowed: true, note: "무료, 로열티 없음" },
  { term: "파생 모델 생성/배포", allowed: true, note: "자유롭게 가능" },
  { term: "판매", allowed: true, note: "다단계 배포 포함" },
  { term: "출력물 소유권", allowed: true, note: "NVIDIA가 주장하지 않음" },
  { term: "Safety Guardrail 우회", allowed: false, note: "라이센스 자동 종료" },
  { term: "수출 규정", allowed: null, note: "미국 수출관리규정 준수 필요" },
];

export default function AboutPage() {
  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      <div className="mb-8">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; Back to Dashboard
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-2">About Coscos</h1>
      <p className="text-muted-foreground mb-8">
        Physical AI Dataset Augmentation Tool powered by NVIDIA Cosmos
      </p>

      {/* Version Info */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Version</h2>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Coscos Version:</span>
              <span className="ml-2 font-mono">v0.1.0</span>
            </div>
            <div>
              <span className="text-muted-foreground">Cosmos Models:</span>
              <span className="ml-2 font-mono">v2.5 / v2.0</span>
            </div>
          </div>
        </div>
      </section>

      {/* Models Used */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">NVIDIA Cosmos Models</h2>
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
              <p className="text-sm text-muted-foreground">{model.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* License Information */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">License Information</h2>
        <div className="bg-card border border-border rounded-lg p-4 mb-4">
          <p className="text-sm mb-4">
            NVIDIA Cosmos 모델들은{" "}
            <a
              href="https://developer.download.nvidia.com/licenses/nvidia-open-model-license-agreement-june-2024.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline hover:no-underline"
            >
              NVIDIA Open Model License
            </a>
            에 따라 라이센스됩니다.
          </p>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-medium">항목</th>
                <th className="text-center py-2 font-medium w-20">허용</th>
                <th className="text-left py-2 font-medium">비고</th>
              </tr>
            </thead>
            <tbody>
              {licenseTerms.map((item) => (
                <tr key={item.term} className="border-b border-border/50">
                  <td className="py-2">{item.term}</td>
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
                  <td className="py-2 text-muted-foreground">{item.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-600 dark:text-yellow-400 mb-2">
            Important Notice
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>
              - 모델의 Safety Guardrail을 우회하거나 비활성화할 경우 라이센스가
              자동 종료됩니다.
            </li>
            <li>
              - 생성된 콘텐츠에 대한 책임은 사용자에게 있습니다.
            </li>
            <li>
              - 미국 수출관리규정(EAR) 및 OFAC 제재를 준수해야 합니다.
            </li>
          </ul>
        </div>
      </section>

      {/* AI Ethics */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">AI Ethics Compliance</h2>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-3">
            본 서비스는 NVIDIA의 Trustworthy AI 가이드라인을 준수합니다.
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
        <h2 className="text-xl font-semibold mb-4">Attribution</h2>
        <div className="bg-muted/50 border border-border rounded-lg p-4 font-mono text-sm">
          <p className="mb-2">Licensed by NVIDIA Corporation under the NVIDIA Open Model License.</p>
          <p className="text-muted-foreground">
            Models: Cosmos-Predict2.5, Cosmos-Transfer2.5, Cosmos-Reason2
          </p>
        </div>
      </section>

      {/* Links */}
      <section>
        <h2 className="text-xl font-semibold mb-4">External Links</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a
            href="https://www.nvidia.com/en-us/ai/cosmos/"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-card border border-border rounded-lg p-4 text-center hover:bg-muted/50 transition-colors"
          >
            <div className="font-semibold mb-1">NVIDIA Cosmos</div>
            <div className="text-xs text-muted-foreground">Official Site</div>
          </a>
          <a
            href="https://github.com/nvidia-cosmos"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-card border border-border rounded-lg p-4 text-center hover:bg-muted/50 transition-colors"
          >
            <div className="font-semibold mb-1">GitHub</div>
            <div className="text-xs text-muted-foreground">Source Code</div>
          </a>
          <a
            href="https://huggingface.co/nvidia"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-card border border-border rounded-lg p-4 text-center hover:bg-muted/50 transition-colors"
          >
            <div className="font-semibold mb-1">HuggingFace</div>
            <div className="text-xs text-muted-foreground">Model Weights</div>
          </a>
          <a
            href="https://developer.download.nvidia.com/licenses/nvidia-open-model-license-agreement-june-2024.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-card border border-border rounded-lg p-4 text-center hover:bg-muted/50 transition-colors"
          >
            <div className="font-semibold mb-1">License</div>
            <div className="text-xs text-muted-foreground">Full Text (PDF)</div>
          </a>
        </div>
      </section>
    </div>
  );
}
