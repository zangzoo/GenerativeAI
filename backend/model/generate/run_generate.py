import os
import torch
import gradio as gr
from diffusers import StableDiffusionPipeline, DDIMScheduler
from transformers import CLIPTokenizer

# =====================================
# 🔥 Device 설정 (MPS / CPU 선택 가능)
# =====================================
FORCE_CPU = True  # ✅ CPU로만 돌리고 싶으면 True 로 바꾸기

if FORCE_CPU:
    device = "cpu"
else:
    device = "mps" if torch.backends.mps.is_available() else "cpu"

print("Using device:", device)

# dtype 설정 (CPU는 float32, MPS는 float16)
dtype = torch.float16 if device == "mps" else torch.float32

# 🔹 Stable Diffusion 모델 로드
model_path = "/Users/zangzoo/vscode/ReadingMate/backend/model/generate/models/stable_diffusion"

pipe = StableDiffusionPipeline.from_pretrained(
    model_path,
    torch_dtype=dtype,
    safety_checker=None
)

# 디바이스로 이동
pipe.to(device)

# DDIM 스케줄러로 교체
pipe.scheduler = DDIMScheduler.from_config(pipe.scheduler.config)

# 🔹 CLIP tokenizer 로드
tokenizer = CLIPTokenizer.from_pretrained(model_path + "/tokenizer", from_slow=True)

# 🔹 긴 문장 자동 chunk 함수
def split_long_prompt(text, max_tokens=75):
    tokens = tokenizer.encode(text)
    chunks = []

    for i in range(0, len(tokens), max_tokens):
        token_chunk = tokens[i:i + max_tokens]
        chunk_text = tokenizer.decode(token_chunk)
        chunks.append(chunk_text)

    return chunks

# ================================
# 🎨 생성 함수 (Gradio에서 호출)
# ================================
def generate_image(user_prompt, steps):
    try:
        prompt_chunks = split_long_prompt(user_prompt)
        final_prompt = ", ".join(prompt_chunks)

        # CPU에서도 동일하게 호출 가능
        with torch.autocast("cpu" if device == "cpu" else "mps", enabled=(device != "cpu")):
            image = pipe(final_prompt, num_inference_steps=steps).images[0]

        return image

    except Exception as e:
        return f"❌ 오류 발생: {str(e)}"

# ================================
# 🌐 Gradio UI
# ================================
with gr.Blocks(title="ReadingMate Image Generator") as demo:
    gr.Markdown("## 🎨 ReadingMate Stable Diffusion 이미지 생성기")
    gr.Markdown("긴 문장을 넣어도 자동으로 chunking해서 생성합니다!")

    with gr.Row():
        with gr.Column(scale=2):
            user_prompt = gr.Textbox(
                label="프롬프트 입력",
                placeholder="여기에 긴 문장을 입력하세요...",
                lines=4
            )
            steps = gr.Slider(20, 80, value=40, step=5, label="Inference Steps")

            submit_btn = gr.Button("이미지 생성!")

        with gr.Column(scale=3):
            output_image = gr.Image(label="결과 이미지", type="pil")

    submit_btn.click(
        fn=generate_image,
        inputs=[user_prompt, steps],
        outputs=[output_image]
    )

# Run
demo.launch(server_name="0.0.0.0", server_port=7860)
