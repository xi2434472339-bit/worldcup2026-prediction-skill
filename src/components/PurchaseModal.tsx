import { CheckCircle2, Copy, X } from "lucide-react";
import { useState } from "react";
import { api } from "../api";

interface PurchaseModalProps {
  open: boolean;
  onClose: () => void;
  contactWechat: string;
  paymentQrUrl: string;
  onRedeemed: (remaining: number) => void;
}

export function PurchaseModal({
  open,
  onClose,
  contactWechat,
  paymentQrUrl,
  onRedeemed,
}: PurchaseModalProps) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  if (!open) return null;

  async function redeem() {
    setLoading(true);
    setMessage("");
    try {
      const result = await api.redeem(code);
      onRedeemed(result.remaining);
      setMessage(`兑换成功，当前可用 ${result.remaining} 次`);
      setCode("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "兑换失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="purchase-modal" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X /></button>
        <span className="eyebrow">朋友专享首发价</span>
        <h2>¥9.9 · 30 次预测</h2>
        <p>微信付款后联系领取兑换码。兑换次数绑定当前浏览器，请勿清除浏览器数据。</p>
        <div className="purchase-grid">
          <div className="qr-placeholder">
            {paymentQrUrl ? <img src={paymentQrUrl} alt="微信收款码" /> : <><span>收款码</span><small>部署前替换</small></>}
          </div>
          <div className="contact-card">
            <small>付款后联系微信</small>
            <strong>{contactWechat || "部署前填写微信号"}</strong>
            <button onClick={() => navigator.clipboard.writeText(contactWechat)}>
              <Copy size={15} />复制微信号
            </button>
          </div>
        </div>
        <div className="redeem-box">
          <label htmlFor="redeem-code">已有兑换码</label>
          <div><input id="redeem-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="GOVA-XXXX-XXXX" /><button disabled={loading || !code.trim()} onClick={redeem}>{loading ? "兑换中" : "立即兑换"}</button></div>
          {message && <p><CheckCircle2 size={15} />{message}</p>}
        </div>
      </section>
    </div>
  );
}
