class Buildchain < Formula
  desc "Release passport and build evidence toolkit"
  homepage "https://buildchain.libkungfu.dev"
  version "3.0.2"
  license "Apache-2.0"

  if OS.mac? && Hardware::CPU.arm?
    url "https://github.com/kungfu-systems/buildchain/releases/download/v3.0.2/buildchain-aarch64-apple-darwin.tar.gz"
    sha256 "001177fc899b6422b1b878343b598ce428c8a031d1efe4e9baa61c581bf45452"
  elsif OS.linux? && Hardware::CPU.intel?
    url "https://github.com/kungfu-systems/buildchain/releases/download/v3.0.2/buildchain-x86_64-unknown-linux-gnu.tar.gz"
    sha256 "7645c49a25e4699a3fef7060679056741d4f11b65c3a43573b622cc9f98faddb"
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
