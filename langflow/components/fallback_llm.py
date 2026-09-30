"""BidMaster Fallback LLM — custom component Langflow.

Satu output model yang di dalamnya berantai otomatis:
Groq 70B -> Groq 8B -> Gemini 2.5-flash -> Ollama lokal (opsional).
Jika provider kehabisan kuota / 429 / 503 / error lain, otomatis lanjut
ke provider berikutnya TANPA setting ulang. Habis semua -> error jujur.

CARA PAKAI (per flow, ~3 menit):
1. Di canvas flow: tambah node "Custom Component", hapus kode contoh,
   paste SELURUH file ini, klik "Check & Save".
2. Isi Groq API Key (wajib, gratis: console.groq.com). Gemini key opsional.
   Ollama: nyalakan hanya jika Ollama jalan di mesin ini.
3. Hubungkan SATU garis: [Fallback LLM] model -> [Agent] model.
   (Input model Agent yang tersambung menimpa dropdown model internal,
   jadi API key per-Agent tidak diperlukan lagi.)
4. Test di Playground. Ulangi untuk 3 flow (copy-paste node antar flow bisa).
"""

from typing import Any, List, Optional

from lfx.custom import Component
from lfx.io import (
    BoolInput,
    DropdownInput,
    FloatInput,
    Output,
    SecretStrInput,
    StrInput,
)

from langchain_core.callbacks import CallbackManagerForLLMRun
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage
from langchain_core.outputs import ChatGeneration, ChatResult
from pydantic import ConfigDict


class _FallbackChatModel(BaseChatModel):
    """Chat model yang mencoba daftar provider berurutan saat gagal."""

    model_config = ConfigDict(arbitrary_types_allowed=True, extra="allow")
    chain: List[Any] = []
    chain_names: List[str] = []

    @property
    def _llm_type(self) -> str:
        return "bidmaster-fallback"

    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> ChatResult:
        last_error: Optional[Exception] = None
        tried: List[str] = []
        for name, model in zip(self.chain_names, self.chain):
            tried.append(name)
            try:
                out = model.invoke(messages, stop=stop)
                if not isinstance(out, BaseMessage):
                    out = AIMessage(content=str(out))
                return ChatResult(generations=[ChatGeneration(message=out)])
            except Exception as e:  # noqa: BLE001 - sengaja: coba provider berikut
                last_error = e
        raise RuntimeError(
            f"Semua provider gagal ({', '.join(tried)}). "
            f"Error terakhir: {last_error}"
        )


class BidMasterFallbackLLM(Component):
    display_name = "BidMaster Fallback LLM"
    description = (
        "Model dengan failover otomatis: Groq 70B, Groq 8B, Gemini, Ollama. "
        "Sambungkan output-nya ke input model Agent."
    )
    documentation = "https://github.com/langchain-ai/langchain"
    icon = "Zap"

    inputs = [
        SecretStrInput(
            name="groq_api_key",
            display_name="Groq API Key",
            info="Wajib. Gratis di console.groq.com (tanpa kartu kredit).",
            required=True,
        ),
        SecretStrInput(
            name="gemini_api_key",
            display_name="Gemini API Key",
            info="Opsional. Dilewati bila kosong. Dari aistudio.google.com.",
            required=False,
            value="",
        ),
        StrInput(
            name="primary_model",
            display_name="Model Utama",
            info="Model pertama yang dicoba.",
            options=[
                "llama-3.3-70b-versatile",
                "llama-3.1-8b-instant",
                "openai/gpt-oss-20b",
                "qwen/qwen3-32b",
            ],
            value="llama-3.3-70b-versatile",
        ),
        FloatInput(
            name="temperature",
            display_name="Temperature",
            value=0.7,
        ),
        BoolInput(
            name="use_ollama",
            display_name="Aktifkan Ollama Lokal",
            info="Nyalakan hanya jika Ollama berjalan (cadangan offline).",
            value=False,
        ),
        StrInput(
            name="ollama_url",
            display_name="Ollama Base URL",
            value="http://localhost:11434",
        ),
        StrInput(
            name="ollama_model",
            display_name="Ollama Model",
            value="qwen2.5:7b",
        ),
    ]

    outputs = [
        Output(display_name="Language Model", name="model", method="build_model"),
    ]

    def _build_chain(self):
        from langchain_google_genai import ChatGoogleGenerativeAI
        from langchain_groq import ChatGroq
        from langchain_ollama import ChatOllama

        chain, names = [], []
        groq_key = (self.groq_api_key or "").strip()
        if groq_key:
            chain.append(ChatGroq(
                api_key=groq_key, model=self.primary_model,
                temperature=self.temperature,
            ))
            names.append(f"groq:{self.primary_model}")
            chain.append(ChatGroq(
                api_key=groq_key, model="llama-3.1-8b-instant",
                temperature=self.temperature,
            ))
            names.append("groq:llama-3.1-8b-instant")
        gemini_key = (self.gemini_api_key or "").strip()
        if gemini_key:
            chain.append(ChatGoogleGenerativeAI(
                google_api_key=gemini_key, model="gemini-2.5-flash",
                temperature=self.temperature,
            ))
            names.append("gemini:gemini-2.5-flash")
        if self.use_ollama:
            chain.append(ChatOllama(
                model=self.ollama_model, base_url=self.ollama_url,
                temperature=self.temperature,
            ))
            names.append(f"ollama:{self.ollama_model}")
        if not chain:
            raise ValueError("Isi minimal Groq API Key (atau nyalakan Ollama).")
        return chain, names

    def build_model(self) -> BaseChatModel:
        chain, names = self._build_chain()
        return _FallbackChatModel(chain=chain, chain_names=names)
