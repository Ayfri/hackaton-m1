<script lang="ts">
  let recording = false;
  let mediaRecorder: MediaRecorder | null = null;
  let audioChunks: Blob[] = [];
  let transcription = '';
  let loading = false;

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      recording = true;
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  }

  function stopRecording() {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
      recording = false;
    }
  }

  async function processAudio(audioBlob: Blob) {
    loading = true;
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      transcription = data.text;
    } catch (error) {
      console.error('Error processing audio:', error);
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-screen bg-gray-900 text-white p-8">
  <div class="max-w-2xl mx-auto">
    <h1 class="text-4xl font-bold mb-8">Assistant Vocal</h1>
    
    <div class="space-y-6">
      <div class="flex justify-center">
        <button
          class={`p-6 rounded-full ${recording ? 'bg-red-600' : 'bg-blue-600'} hover:opacity-90 transition-opacity`}
          on:click={recording ? stopRecording : startRecording}
        >
          {#if loading}
            <div class="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full"></div>
          {:else}
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {#if recording}
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"></path>
              {:else}
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
              {/if}
            </svg>
          {/if}
        </button>
      </div>

      {#if transcription}
        <div class="bg-gray-800 p-6 rounded-lg">
          <h2 class="text-xl font-semibold mb-2">Transcription:</h2>
          <p class="text-gray-300">{transcription}</p>
        </div>
      {/if}
    </div>
  </div>
</div>