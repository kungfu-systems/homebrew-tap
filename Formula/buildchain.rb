class Buildchain < Formula
  desc "Release passport and build evidence toolkit"
  homepage "https://buildchain.libkungfu.dev"
  version "2.14.16"
  license "Apache-2.0"

  if OS.mac? && Hardware::CPU.arm?
    url "https://github.com/kungfu-systems/buildchain/releases/download/v2.14.16/buildchain-aarch64-apple-darwin.tar.gz"
    sha256 "8be23744adc0aeb33327313da7d660f656f865f4d2630db10d711afbc5544c0f"
  elsif OS.linux? && Hardware::CPU.intel?
    url "https://github.com/kungfu-systems/buildchain/releases/download/v2.14.16/buildchain-x86_64-unknown-linux-gnu.tar.gz"
    sha256 "acbd6af082987e7768ad43e4edac5aa03c0f0cdfd84c742876758be9ea2d55ff"
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
