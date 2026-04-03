// Fetches resume PDF base64 from RTDB on demand, decodes to Blob, triggers download.
// Falls back to /resume.pdf if nothing is stored.
export async function downloadResume() {
  try {
    const mod = await import('../firebase');
    const { getDatabase, ref, get } = await import('firebase/database');
    const db = getDatabase(mod.app);
    const snap = await get(ref(db, 'ov/resume_b64'));
    if (snap.exists()) {
      const b64 = snap.val();
      const byteString = atob(b64.split(',')[1]);
      const bytes = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) bytes[i] = byteString.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Ashin-Sabu-Resume.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }
  } catch {
    // Firebase unavailable or nothing stored — fall through
  }
  // Fallback: local file
  const a = document.createElement('a');
  a.href = '/resume.pdf';
  a.download = 'Ashin-Sabu-Resume.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
