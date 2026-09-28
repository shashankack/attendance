import Image from "next/image";

export function Logo() {
  return (
    <Image
      src="/baw_logo.jpg"
      alt="BAW"
      width={40}
      height={40}
      priority
      className="size-10 rounded-lg"
    />
  );
}
