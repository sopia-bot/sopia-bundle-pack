import crypto from 'crypto';

interface PromiseHandshakeData<T> {
  id: string;
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
}

const phMap = new Map<string, PromiseHandshakeData<any>>();

export async function createPromiseHandshake<T>(): Promise<
  PromiseHandshakeData<T>
> {
  const id = crypto.randomUUID();
  let data: PromiseHandshakeData<T> = { id } as PromiseHandshakeData<T>;
  await new Promise<PromiseHandshakeData<T>>(
    (handshakeResolve, handshakeReject) => {
      const promise = new Promise<PromiseHandshakeData<T>>(
        (resolve, reject) => {
          data.resolve = resolve as (value: T) => void;
          data.reject = reject as (reason?: any) => void;
        }
      );
      data.promise = promise as Promise<T>;
      handshakeResolve(data);
    }
  );
  phMap.set(id, data);
  return data;
}

export async function resolvePromiseHandshake(id: string, value: any) {
  const data = phMap.get(id);
  console.log('resolvePromiseHandshake', id, value, data);
  if (data) {
    data.resolve(value);
  }
}

export async function rejectPromiseHandshake(id: string, reason?: any) {
  const data = phMap.get(id);
  if (data) {
    data.reject(reason);
  }
}

export async function clearPromiseHandshake(id: string) {
  phMap.delete(id);
}