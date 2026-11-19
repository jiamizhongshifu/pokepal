import { useEffect, useState } from 'react';
import { describeStorage, storageFacts, type StorageFacts as Facts } from '../lib/saveExport';

/** Plain facts about where progress lives and how it can be lost; no promise of offline or cloud safety. */
export function StorageFacts() {
  const [facts, setFacts] = useState<Facts>({});
  useEffect(() => { void storageFacts().then(setFacts); }, []);
  return <div className="parent-storage-facts">
    <p><strong>只存在这台设备的这个浏览器里。</strong>清除浏览器的网站数据、卸载浏览器、使用无痕窗口或换设备，存档、跟读录音和小日记都会丢失，运营者也无法远程找回。需要保留时，请定期导出存档并备份日记。</p>
    <small>{describeStorage(facts)}</small>
  </div>;
}
