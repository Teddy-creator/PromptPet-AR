"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";

import { LanguageToggle } from "@/components/language-toggle";
import { useSiteLanguage } from "@/components/site-language";
import { demoGenerationId } from "@/lib/generation-constants";
import {
  createGenerationRequest,
  type HomeModeChoice,
  type HomeProfileChoice,
  type HomeStyleChoice,
} from "@/lib/generation-client";
import {
  buildInitialClientLlmDraft,
  clientLlmProviderOptions,
  clientLlmStorageKey,
  serializeClientLlmDraft,
  type ClientLlmDraft,
  type ClientLlmProviderChoice,
} from "@/lib/llm/client-config";
import { homepageDemoPrompts } from "@/data/demo-prompt-pack";

import styles from "./home-experience.module.css";

const heroImageUrl =
  "https://images.unsplash.com/photo-1774979300561-712abf6bcbb4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXRlJTIwZm94JTIwdG95JTIwZmlndXJpbmUlMjBkZXNrJTIwY29sbGVjdGlibGV8ZW58MXx8fHwxNzc1ODE5NDAzfDA&ixlib=rb-4.1.0&q=80&w=1080";

const motionEase = [0.16, 1, 0.3, 1] as const;
const envClientLlmDraft = buildInitialClientLlmDraft();

function getProviderLabel(
  provider: (typeof clientLlmProviderOptions)[number],
  t: (zh: string, en: string) => string,
) {
  return provider === "deepseek"
    ? "DeepSeek"
    : t("OpenAI 兼容", "OpenAI Compatible");
}

export function HomeExperience() {
  const router = useRouter();
  const { t } = useSiteLanguage();
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<HomeStyleChoice>("cream");
  const [mode, setMode] = useState<HomeModeChoice>("fast");
  const [profile, setProfile] = useState<HomeProfileChoice>("safe");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "error">("idle");
  const [submitError, setSubmitError] = useState("");
  const [llmDraft, setLlmDraft] = useState<ClientLlmDraft>(envClientLlmDraft);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const storedDraftRaw = window.localStorage.getItem(clientLlmStorageKey);

      if (!storedDraftRaw) {
        return;
      }

      setLlmDraft(
        buildInitialClientLlmDraft({
          envDefaults: envClientLlmDraft,
          storedDraft: JSON.parse(storedDraftRaw),
        }),
      );
    } catch {
      try {
        window.localStorage.removeItem(clientLlmStorageKey);
      } catch {
        // Ignore storage cleanup failures.
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const serializedDraft = serializeClientLlmDraft(llmDraft);

      if (serializedDraft) {
        window.localStorage.setItem(
          clientLlmStorageKey,
          JSON.stringify(serializedDraft),
        );
        return;
      }

      window.localStorage.removeItem(clientLlmStorageKey);
    } catch {
      // Ignore storage failures so generation flow can still proceed.
    }
  }, [llmDraft]);

  function updateLlmDraft<K extends keyof ClientLlmDraft>(
    key: K,
    value: ClientLlmDraft[K],
  ) {
    setLlmDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleCreateGeneration() {
    if (submitState === "submitting") {
      return;
    }

    setSubmitState("submitting");
    setSubmitError("");

    try {
      const created = await createGenerationRequest({
        prompt,
        style,
        mode,
        profile,
        llmDraft,
      });

      startTransition(() => {
        router.push(`/result/${created.id}`);
      });
    } catch (error) {
      setSubmitState("error");
      setSubmitError(
        error instanceof Error && error.message.trim()
          ? error.message
          : t("生成请求失败，请稍后再试。", "Generation request failed. Please try again."),
      );
    }
  }

  return (
    <main className={styles.page}>
      <LanguageToggle />
      <div className={styles.frame}>
        <div className={styles.grid}>
          <motion.section
            className={styles.contentColumn}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: motionEase }}
          >
            <div className={styles.heroBlock}>
              <div className={styles.brandPill}>
                <span className={styles.brandMark}>✦</span>
                <span>PromptPet-AR</span>
              </div>
              <h1 className={styles.title}>
                {t("一句话生成你的小狐狸", "Create your fox")}
              </h1>
              <p className={styles.lede}>
                {t(
                  "输入一句话，生成一只可爱的 3D 小狐狸桌宠，并把它放进现实世界",
                  "Type one sentence to create a charming 3D fox desk pet and place it into the real world.",
                )}
              </p>
              <div className={styles.metaPills}>
                <span>{t("仅支持狐狸 Alpha", "Fox-only Alpha")}</span>
                <span>{t("Android 优先 AR", "Android-first AR")}</span>
                <span>{t("支持自带 Key", "BYOK Optional")}</span>
              </div>
            </div>

            <div className={styles.formStack}>
              <section className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="prompt">
                  {t("描述你的小狐狸", "Describe your fox")}
                </label>
                <textarea
                  id="prompt"
                  className={styles.promptInput}
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder={t(
                    "例如：戴着小围巾在读书的狐狸",
                    "e.g. A fox wearing a scarf and reading a book",
                  )}
                />
                <div className={styles.chips}>
                  {homepageDemoPrompts.map((example) => (
                    <button
                      key={example.id}
                      type="button"
                      className={styles.chip}
                      onClick={() => setPrompt(t(example.promptZh, example.promptEn))}
                    >
                      {t(example.shortLabelZh, example.shortLabelEn)}
                    </button>
                  ))}
                </div>
                <p className={styles.helperText}>
                  {t(
                    "推荐先试这 3 条演示语句，当前更适合作为 demo 展示而不是开放世界生成。",
                    "Start with these three demo-ready prompts. This project is better presented as a curated demo than an open-world generator.",
                  )}
                </p>
              </section>

              <div className={styles.selectionGrid}>
                <section className={styles.fieldGroup}>
                  <label className={styles.label}>
                    {t("风格模板", "Style Template")}
                  </label>
                  <div className={styles.optionGridThree}>
                    {[
                      { id: "cream", zh: "奶油玩具感", en: "Cream Toy" },
                      { id: "lowpoly", zh: "低模卡通感", en: "Low Poly" },
                      { id: "dream", zh: "梦幻发光感", en: "Dream Glow" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`${styles.optionButton} ${
                          style === item.id ? styles.optionButtonPrimary : ""
                        }`}
                        onClick={() => setStyle(item.id as HomeStyleChoice)}
                      >
                        {t(item.zh, item.en)}
                      </button>
                    ))}
                  </div>
                  <p className={styles.helperText}>
                    {t("选择 3D 模型的视觉风格", "Choose the visual style of your 3D model")}
                  </p>
                </section>

                <section className={styles.fieldGroup}>
                  <label className={styles.label}>
                    {t("生成模式", "Generation Mode")}
                  </label>
                  <div className={styles.optionGridTwo}>
                    {[
                      { id: "fast", zh: "快速稳定", en: "Fast Stable" },
                      { id: "dynamic", zh: "动态定制", en: "Dynamic Custom" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`${styles.optionButton} ${
                          mode === item.id ? styles.optionButtonDark : ""
                        }`}
                        onClick={() => setMode(item.id as HomeModeChoice)}
                      >
                        {t(item.zh, item.en)}
                      </button>
                    ))}
                  </div>
                  <p className={styles.helperText}>
                    {t(
                      "快速模式更稳定，动态模式可深度定制",
                      "Fast mode is more stable, dynamic mode offers deeper customization",
                    )}
                  </p>
                </section>
              </div>

              <AnimatePresence initial={false}>
                {mode === "dynamic" ? (
                  <motion.section
                    className={styles.fieldGroup}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.28, ease: motionEase }}
                  >
                    <label className={styles.label}>
                      {t("定制配置", "Customization Profile")}
                    </label>
                    <div className={styles.optionGridTwo}>
                      {[
                        { id: "safe", zh: "稳定定制", en: "Safe Overlay" },
                        {
                          id: "experimental",
                          zh: "实验定制",
                          en: "Experimental Addon",
                        },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`${styles.optionButton} ${
                            profile === item.id ? styles.optionButtonMoss : ""
                          }`}
                          onClick={() => setProfile(item.id as HomeProfileChoice)}
                        >
                          {t(item.zh, item.en)}
                        </button>
                      ))}
                    </div>
                  </motion.section>
                ) : null}
              </AnimatePresence>

              <section className={styles.fieldGroup}>
                <button
                  type="button"
                  className={styles.advancedTrigger}
                  onClick={() => setAdvancedOpen((current) => !current)}
                >
                  <span
                    className={`${styles.chevron} ${
                      advancedOpen ? styles.chevronOpen : ""
                    }`}
                  >
                    ˅
                  </span>
                  <span>{t("高级 LLM 设置", "Advanced LLM Settings")}</span>
                </button>
                <AnimatePresence initial={false}>
                  {advancedOpen ? (
                    <motion.div
                      className={styles.advancedPanel}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.24, ease: motionEase }}
                    >
                      <select
                        className={`${styles.advancedInput} ${styles.advancedSelect}`}
                        value={llmDraft.provider}
                        onChange={(event) =>
                          updateLlmDraft(
                            "provider",
                            event.target.value as ClientLlmProviderChoice,
                          )
                        }
                      >
                        <option value="">
                          {t("跟随后端默认", "Follow backend default")}
                        </option>
                        {clientLlmProviderOptions.map((provider) => (
                          <option key={provider} value={provider}>
                            {getProviderLabel(provider, t)}
                          </option>
                        ))}
                      </select>
                      <input
                        className={styles.advancedInput}
                        type="text"
                        value={llmDraft.model}
                        onChange={(event) => updateLlmDraft("model", event.target.value)}
                        placeholder={t("模型", "Model")}
                      />
                      <input
                        className={styles.advancedInput}
                        type="text"
                        value={llmDraft.baseUrl}
                        onChange={(event) => updateLlmDraft("baseUrl", event.target.value)}
                        placeholder="Base URL"
                      />
                      <input
                        className={styles.advancedInput}
                        type="password"
                        value={llmDraft.apiKey}
                        onChange={(event) => updateLlmDraft("apiKey", event.target.value)}
                        placeholder="API Key"
                      />
                      <p className={styles.advancedNote}>
                        {t(
                          "这里的 Key 只保存在当前浏览器，并只随这次请求发送，不会写进生成产物。",
                          "This key stays in this browser and is sent only with the request. It is never written into saved generation artifacts.",
                        )}
                      </p>
                      <p className={styles.advancedNote}>
                        {t(
                          "留空时会跟随后端默认；如果兼容网关不支持当前结构化输出合同，结果页会诚实显示规则回退。",
                          "Blank fields follow the backend default. If a compatible gateway cannot handle the current structured-output contract, the result page will honestly show a rule fallback.",
                        )}
                      </p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </section>

              <div className={styles.actionRow}>
                <button
                  type="button"
                  className={styles.primaryAction}
                  onClick={() => void handleCreateGeneration()}
                  disabled={submitState === "submitting"}
                  aria-busy={submitState === "submitting"}
                >
                  {submitState === "submitting"
                    ? t("正在创建生成任务...", "Creating generation...")
                    : t("生成我的小狐狸", "Generate my fox pet")}
                </button>
                <button
                  type="button"
                  className={styles.secondaryAction}
                  onClick={() => router.push(`/share/${demoGenerationId}`)}
                >
                  {t("查看 Demo", "View Demo")}
                </button>
              </div>

              {submitError ? (
                <p className={styles.inlineError} role="alert">
                  {submitError}
                </p>
              ) : null}

              {submitState === "submitting" ? (
                <p className={styles.inlineStatus} role="status">
                  {t(
                    "我们正在创建真实生成任务，马上跳转到结果页。",
                    "We are creating the real generation task and will jump to the result page shortly.",
                  )}
                </p>
              ) : null}
            </div>
          </motion.section>

          <motion.section
            className={styles.visualColumn}
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.95, ease: motionEase, delay: 0.12 }}
          >
            <div className={styles.imageGlow} />
            <div className={styles.visualCard}>
              <img
                src={heroImageUrl}
                alt="Fox figurine on a hand"
                className={styles.visualImage}
                loading="eager"
              />
            </div>
          </motion.section>
        </div>
      </div>
    </main>
  );
}
