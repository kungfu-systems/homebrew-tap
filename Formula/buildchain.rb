class Buildchain < Formula
  desc "Release passport and build evidence toolkit"
  homepage "https://buildchain.libkungfu.dev"
  version "2.8.15"
  license "Apache-2.0"

  if OS.mac? && Hardware::CPU.arm?
    url "https://github.com/kungfu-systems/buildchain/releases/download/v2.8.15/buildchain-aarch64-apple-darwin.tar.gz"
    sha256 "b9452e041ac1cdbaaf06fdc207a971822222ab42aab742dec3860e2b2ba41d5c"
  elsif OS.linux? && Hardware::CPU.intel?
    url "https://github.com/kungfu-systems/buildchain/releases/download/v2.8.15/buildchain-x86_64-unknown-linux-gnu.tar.gz"
    sha256 "d7ed052e43e9eda57eac1c8367947d5a950a35b2934a10a833d94cdbb2ee3f41"
  else
    odie "Buildchain Homebrew formula currently supports macOS arm64 and Linux x86_64 binary archives."
  end

  def install
    bin.install "buildchain"
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/buildchain version")
  end
end
