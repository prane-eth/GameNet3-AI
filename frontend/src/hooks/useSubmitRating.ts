// Common code to rate a game, for both Game List and Game Details pages
import axios from 'axios';

interface SubmitOptions {
  backendUrl: string;
  signer: any; // ethers signer
  address: string;
}

export default function useSubmitRating() {
  // Returns a function that performs sign + submit and returns { success, error }
  const submit = async (opts: SubmitOptions & { gameId: string; rating: number; review: string }) => {
    const { backendUrl, signer, address, gameId, rating, review } = opts;

    if (!signer || !address) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      const message = `Rate game ${gameId} with ${rating} stars at ${Date.now()}`;

      // Try signer.signMessage with timeout
      let signature: string | undefined;
      try {
        const signPromise = signer.signMessage(message);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Signing timeout')), 30000));
        signature = await Promise.race([signPromise, timeoutPromise]) as string;
      } catch (signErr) {
        // fallback to window.ethereum.personal_sign
        const eth = (window as any).ethereum;
        if (eth && eth.request) {
          try {
            signature = await eth.request({ method: 'personal_sign', params: [message, address] });
          } catch (personalErr) {
            return { success: false, error: (personalErr instanceof Error) ? personalErr.message : String(personalErr) };
          }
        } else {
          return { success: false, error: (signErr instanceof Error) ? signErr.message : String(signErr) };
        }
      }

      // Submit to backend
      const resp = await axios.post(`${backendUrl}/reviews`, {
        gameId,
        rating,
        text: review,
        signature,
        message
      });

      return { success: true, data: resp.data };
    } catch (err: any) {
      if (axios.isAxiosError && axios.isAxiosError(err)) {
        const respData = err.response?.data;
        const reason = respData?.reason || respData?.message || respData?.error;
        return { success: false, error: reason ? String(reason) : respData ? JSON.stringify(respData) : err.message };
      }
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  };

  return { submit };
}
